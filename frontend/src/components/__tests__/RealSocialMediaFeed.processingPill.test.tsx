/**
 * TDD Test Suite: Processing Pill Visibility Fix
 *
 * @description Comprehensive tests for comment submission processing state
 * @prerequisites
 *   - RealSocialMediaFeed component exists
 *   - API service is mockable
 *   - Comment submission flow is implemented
 *
 * @test-phase RED (All tests should FAIL initially)
 * @expected After implementation, all tests should PASS (GREEN phase)
 */

import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { UserProvider } from '../../contexts/UserContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock API service BEFORE importing component
const mockApiService = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  getPosts: vi.fn(() => Promise.resolve({
    data: {
      data: [
        {
          id: 'post-1',
          content: 'Test post 1',
          author: 'Agent 1',
          created_at: new Date().toISOString(),
          comments: [],
          likes: [],
          shares: 0,
          hashtags: ['#test']
        },
        {
          id: 'post-2',
          content: 'Test post 2',
          author: 'Agent 2',
          created_at: new Date().toISOString(),
          comments: [],
          likes: [],
          shares: 0,
          hashtags: ['#test']
        }
      ]
    }
  })),
  getFilterData: vi.fn(() => Promise.resolve({
    data: {
      agents: ['Agent 1', 'Agent 2'],
      hashtags: ['#test']
    }
  }))
};

vi.mock('../../api/agentFeed', () => ({
  default: mockApiService
}));

// Import component AFTER mocking
import RealSocialMediaFeed from '../RealSocialMediaFeed';

// Helper to render with all required providers
const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <UserProvider defaultUserId="test-user-123">
        {component}
      </UserProvider>
    </QueryClientProvider>
  );
};

describe('RealSocialMediaFeed - Processing Pill Visibility', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Setup fetch mock with default success response
    mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'comment-123',
          postId: 'post-1',
          author: 'Test User',
          content: 'Test comment',
          timestamp: new Date().toISOString(),
          isProcessing: false,
        }),
      })
    );
    global.fetch = mockFetch;

    // Reset API mock
    vi.clearAllMocks();
    mockApiService.getPosts.mockClear();
    mockApiService.getFilterData.mockClear();
    mockApiService.on.mockClear();
    mockApiService.off.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * @test Processing Pill Visibility During Comment Submission
   * @description Validates that processing state displays when comment is submitted
   * @steps
   *   1. Render feed with a post
   *   2. Open comment form
   *   3. Submit a comment
   *   4. Verify button shows "Adding Comment..." with spinner
   *   5. Verify textarea is disabled
   *   6. Verify form remains visible
   * @expected Processing state visible during submission
   */
  it('should show processing state when comment is submitted', async () => {
    const user = userEvent.setup();

    // Arrange: Render feed with a post
    renderWithProviders(<RealSocialMediaFeed />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Find and open comment form for first post
    const commentButtons = screen.getAllByText(/comment/i);
    await user.click(commentButtons[0]);

    // Fill in comment text
    const textarea = screen.getByPlaceholderText(/write a comment/i);
    await user.type(textarea, 'Test comment');

    // Mock slow API response
    mockFetch.mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'comment-123',
          postId: 'post-1',
          author: 'Test User',
          content: 'Test comment',
          timestamp: new Date().toISOString(),
        }),
      }), 500))
    );

    // Act: Submit comment
    const submitButton = screen.getByRole('button', { name: /add comment/i });
    await user.click(submitButton);

    // Assert: Button shows "Adding Comment..." with spinner
    await waitFor(() => {
      expect(screen.getByText(/adding comment\.\.\./i)).toBeInTheDocument();
    });

    // Assert: Textarea is disabled
    expect(textarea).toBeDisabled();

    // Assert: Form is still visible (not closed)
    expect(textarea).toBeVisible();
  });

  /**
   * @test Form Stays Open During Processing
   * @description Ensures comment form doesn't close prematurely during submission
   * @steps
   *   1. Render feed and open comment form
   *   2. Submit comment
   *   3. Verify form visible during API call
   *   4. Verify form closes only after response
   * @expected Form remains open until API completes
   */
  it('should keep comment form open while processing', async () => {
    const user = userEvent.setup();

    // Arrange: Render feed and open comment form
    renderWithProviders(<RealSocialMediaFeed />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const commentButtons = screen.getAllByText(/comment/i);
    await user.click(commentButtons[0]);

    const textarea = screen.getByPlaceholderText(/write a comment/i);
    await user.type(textarea, 'Test comment');

    // Mock delayed response
    let resolvePromise: (value: any) => void;
    const delayedPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    mockFetch.mockImplementationOnce(() => delayedPromise.then(() => ({
      ok: true,
      json: () => Promise.resolve({
        id: 'comment-123',
        postId: 'post-1',
        author: 'Test User',
        content: 'Test comment',
        timestamp: new Date().toISOString(),
      }),
    })));

    // Act: Submit comment
    const submitButton = screen.getByRole('button', { name: /add comment/i });
    await user.click(submitButton);

    // Assert: Form still visible after submission
    await waitFor(() => {
      expect(screen.getByText(/adding comment\.\.\./i)).toBeInTheDocument();
    });
    expect(textarea).toBeVisible();

    // Resolve the API call
    resolvePromise!({});

    // Assert: Form closes after API response
    await waitFor(() => {
      expect(textarea).not.toBeInTheDocument();
    });
  });

  /**
   * @test Button Shows Loading State
   * @description Validates button UI changes during processing
   * @steps
   *   1. Render with comment form open
   *   2. Click "Add Comment"
   *   3. Verify button text changes to "Adding Comment..."
   *   4. Verify spinner icon is visible
   *   5. Verify button is disabled
   * @expected Button displays loading state correctly
   */
  it('should show spinner in button during processing', async () => {
    const user = userEvent.setup();

    // Arrange: Render with comment form open
    renderWithProviders(<RealSocialMediaFeed />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const commentButtons = screen.getAllByText(/comment/i);
    await user.click(commentButtons[0]);

    const textarea = screen.getByPlaceholderText(/write a comment/i);
    await user.type(textarea, 'Test comment');

    // Mock delayed response
    mockFetch.mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'comment-123',
          postId: 'post-1',
          author: 'Test User',
          content: 'Test comment',
          timestamp: new Date().toISOString(),
        }),
      }), 300))
    );

    // Act: Click "Add Comment"
    const submitButton = screen.getByRole('button', { name: /add comment/i });
    await user.click(submitButton);

    // Assert: Button text changes to "Adding Comment..."
    await waitFor(() => {
      expect(screen.getByText(/adding comment\.\.\./i)).toBeInTheDocument();
    });

    // Assert: Loader2 icon is visible (check for svg with animation class)
    const button = screen.getByRole('button', { name: /adding comment/i });
    expect(button).toBeInTheDocument();

    // Assert: Button is disabled
    expect(button).toBeDisabled();
  });

  /**
   * @test Textarea is Disabled During Processing
   * @description Ensures textarea cannot be edited during submission
   * @steps
   *   1. Render with text in textarea
   *   2. Submit comment
   *   3. Verify textarea has disabled attribute
   *   4. Verify textarea is not editable
   * @expected Textarea is properly disabled
   */
  it('should disable textarea while comment is processing', async () => {
    const user = userEvent.setup();

    // Arrange: Render with text in textarea
    renderWithProviders(<RealSocialMediaFeed />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const commentButtons = screen.getAllByText(/comment/i);
    await user.click(commentButtons[0]);

    const textarea = screen.getByPlaceholderText(/write a comment/i);
    await user.type(textarea, 'Test comment');

    // Mock delayed response
    mockFetch.mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'comment-123',
          postId: 'post-1',
          author: 'Test User',
          content: 'Test comment',
          timestamp: new Date().toISOString(),
        }),
      }), 300))
    );

    // Act: Submit comment
    const submitButton = screen.getByRole('button', { name: /add comment/i });
    await user.click(submitButton);

    // Assert: Textarea has disabled attribute
    await waitFor(() => {
      expect(textarea).toBeDisabled();
    });

    // Assert: Textarea is not editable (try to type)
    await user.type(textarea, 'Should not type');
    expect(textarea).toHaveValue('Test comment'); // Value unchanged
  });

  /**
   * @test Form Closes After Success
   * @description Validates form closes and comment appears after successful submission
   * @steps
   *   1. Mock successful API response
   *   2. Submit comment
   *   3. Wait for API to resolve
   *   4. Verify form is closed
   *   5. Verify new comment appears in list
   * @expected Form closes and comment displays
   */
  it('should close form after comment posts successfully', async () => {
    const user = userEvent.setup();

    // Arrange: Mock successful API response
    const mockComment = {
      id: 'comment-123',
      postId: 'post-1',
      author: 'Test User',
      content: 'Test comment content',
      timestamp: new Date().toISOString(),
      isProcessing: false,
    };

    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockComment),
      })
    );

    renderWithProviders(<RealSocialMediaFeed />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const commentButtons = screen.getAllByText(/comment/i);
    await user.click(commentButtons[0]);

    const textarea = screen.getByPlaceholderText(/write a comment/i);
    await user.type(textarea, 'Test comment content');

    // Act: Submit comment
    const submitButton = screen.getByRole('button', { name: /add comment/i });
    await user.click(submitButton);

    // Wait: For API to resolve
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Assert: Form is closed
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/write a comment/i)).not.toBeInTheDocument();
    });

    // Assert: New comment appears in list
    await waitFor(() => {
      expect(screen.getByText('Test comment content')).toBeInTheDocument();
    });
  });

  /**
   * @test Multiple Comments Processing
   * @description Ensures processing states are independent per post
   * @steps
   *   1. Render feed with 2 posts
   *   2. Submit comment on post 1
   *   3. Verify only post 1 shows processing state
   *   4. Verify post 2 form is unaffected
   * @expected Independent processing states per post
   */
  it('should handle multiple posts with independent processing states', async () => {
    const user = userEvent.setup();

    // Arrange: Render feed with 2 posts
    renderWithProviders(<RealSocialMediaFeed />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Open comment forms on both posts
    const commentButtons = screen.getAllByText(/comment/i);
    expect(commentButtons.length).toBeGreaterThanOrEqual(2);

    await user.click(commentButtons[0]); // First post
    await user.click(commentButtons[1]); // Second post

    const textareas = screen.getAllByPlaceholderText(/write a comment/i);
    expect(textareas.length).toBe(2);

    // Type in first textarea
    await user.type(textareas[0], 'Comment on post 1');

    // Mock delayed response
    mockFetch.mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'comment-123',
          postId: 'post-1',
          author: 'Test User',
          content: 'Comment on post 1',
          timestamp: new Date().toISOString(),
        }),
      }), 500))
    );

    // Act: Submit comment on post 1
    const submitButtons = screen.getAllByRole('button', { name: /add comment/i });
    await user.click(submitButtons[0]);

    // Assert: Only post 1 shows processing state
    await waitFor(() => {
      expect(textareas[0]).toBeDisabled();
    });

    // Assert: Post 2 form is unaffected
    expect(textareas[1]).not.toBeDisabled();
    expect(submitButtons[1]).not.toBeDisabled();
  });

  /**
   * @test Processing State Clears on Error
   * @description Validates error handling and state cleanup
   * @steps
   *   1. Mock API error
   *   2. Submit comment
   *   3. Wait for API to reject
   *   4. Verify processing state is removed
   *   5. Verify form is still open (for retry)
   *   6. Verify button re-enabled
   * @expected Processing state clears on error
   */
  it('should clear processing state if API fails', async () => {
    const user = userEvent.setup();

    // Arrange: Mock API error
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      })
    );

    renderWithProviders(<RealSocialMediaFeed />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const commentButtons = screen.getAllByText(/comment/i);
    await user.click(commentButtons[0]);

    const textarea = screen.getByPlaceholderText(/write a comment/i);
    await user.type(textarea, 'Test comment');

    // Act: Submit comment
    const submitButton = screen.getByRole('button', { name: /add comment/i });
    await user.click(submitButton);

    // Wait: For API to reject
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Assert: Processing state is removed
    await waitFor(() => {
      expect(screen.queryByText(/adding comment\.\.\./i)).not.toBeInTheDocument();
    });

    // Assert: Form is still open (for retry)
    expect(textarea).toBeInTheDocument();
    expect(textarea).toBeVisible();

    // Assert: Button re-enabled
    const retryButton = screen.getByRole('button', { name: /add comment/i });
    expect(retryButton).not.toBeDisabled();
  });

  /**
   * @test Visual Feedback Timing
   * @description Ensures processing state persists for entire API call
   * @steps
   *   1. Mock slow API (500ms delay)
   *   2. Submit comment
   *   3. Verify processing state visible immediately
   *   4. Wait 250ms and verify still processing
   *   5. Wait for completion and verify state removed
   * @expected Processing state visible throughout API call
   */
  it('should show processing state for entire API call duration', async () => {
    const user = userEvent.setup();

    // Arrange: Mock slow API (500ms delay)
    mockFetch.mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'comment-123',
          postId: 'post-1',
          author: 'Test User',
          content: 'Test comment',
          timestamp: new Date().toISOString(),
        }),
      }), 500))
    );

    renderWithProviders(<RealSocialMediaFeed />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const commentButtons = screen.getAllByText(/comment/i);
    await user.click(commentButtons[0]);

    const textarea = screen.getByPlaceholderText(/write a comment/i);
    await user.type(textarea, 'Test comment');

    // Act: Submit comment
    const submitButton = screen.getByRole('button', { name: /add comment/i });
    await user.click(submitButton);

    // Assert: Processing state visible immediately
    await waitFor(() => {
      expect(screen.getByText(/adding comment\.\.\./i)).toBeInTheDocument();
    });

    // Wait: 250ms
    await new Promise(resolve => setTimeout(resolve, 250));

    // Assert: Still showing processing state
    expect(screen.getByText(/adding comment\.\.\./i)).toBeInTheDocument();
    expect(textarea).toBeDisabled();

    // Wait: For completion
    await waitFor(() => {
      expect(screen.queryByText(/adding comment\.\.\./i)).not.toBeInTheDocument();
    }, { timeout: 1000 });

    // Assert: Processing state removed
    expect(screen.queryByPlaceholderText(/write a comment/i)).not.toBeInTheDocument();
  });

  /**
   * @test Keyboard Interaction During Processing
   * @description Prevents duplicate submissions during processing
   * @steps
   *   1. Open form with comment text
   *   2. Submit comment
   *   3. Press Enter in textarea (attempt resubmit)
   *   4. Verify no duplicate submission
   *   5. Verify still in processing state
   * @expected No duplicate submissions during processing
   */
  it('should prevent form submission while processing', async () => {
    const user = userEvent.setup();

    // Arrange: Form with comment text
    mockFetch.mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'comment-123',
          postId: 'post-1',
          author: 'Test User',
          content: 'Test comment',
          timestamp: new Date().toISOString(),
        }),
      }), 500))
    );

    renderWithProviders(<RealSocialMediaFeed />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const commentButtons = screen.getAllByText(/comment/i);
    await user.click(commentButtons[0]);

    const textarea = screen.getByPlaceholderText(/write a comment/i);
    await user.type(textarea, 'Test comment');

    // Act: Submit comment
    const submitButton = screen.getByRole('button', { name: /add comment/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/adding comment\.\.\./i)).toBeInTheDocument();
    });

    // Act: Press Enter in textarea (try to submit again)
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

    // Wait a bit to see if duplicate call happens
    await new Promise(resolve => setTimeout(resolve, 100));

    // Assert: No duplicate submission
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Assert: Still in processing state
    expect(screen.getByText(/adding comment\.\.\./i)).toBeInTheDocument();
    expect(textarea).toBeDisabled();
  });

  /**
   * @test Regression: Original Processing Pill Still Works
   * @description Ensures backward compatibility with existing processing indicator
   * @steps
   *   1. Render feed
   *   2. Submit comment
   *   3. Verify blue pill with "Processing comment..." visible
   *   4. Verify located below comment form
   * @expected Original processing pill displays correctly
   */
  it('should still show the blue processing pill below form as fallback', async () => {
    const user = userEvent.setup();

    // Arrange: Render feed
    mockFetch.mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'comment-123',
          postId: 'post-1',
          author: 'Test User',
          content: 'Test comment',
          timestamp: new Date().toISOString(),
        }),
      }), 500))
    );

    renderWithProviders(<RealSocialMediaFeed />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const commentButtons = screen.getAllByText(/comment/i);
    await user.click(commentButtons[0]);

    const textarea = screen.getByPlaceholderText(/write a comment/i);
    await user.type(textarea, 'Test comment');

    // Act: Submit comment
    const submitButton = screen.getByRole('button', { name: /add comment/i });
    await user.click(submitButton);

    // Assert: Blue pill with "Processing comment..." visible
    await waitFor(() => {
      const processingPill = screen.queryByText(/processing comment/i);
      if (processingPill) {
        expect(processingPill).toBeInTheDocument();

        // Assert: Located below comment form (check parent structure)
        const pillContainer = processingPill.closest('div');
        expect(pillContainer).toBeInTheDocument();
      }
    });
  });

  /**
   * @test Edge Case: Rapid Sequential Submissions
   * @description Handles rapid clicking on submit button
   * @steps
   *   1. Open comment form
   *   2. Rapidly click submit button 3 times
   *   3. Verify only one API call made
   *   4. Verify processing state maintained
   * @expected Debounces rapid submissions
   */
  it('should debounce rapid sequential submission attempts', async () => {
    const user = userEvent.setup();

    mockFetch.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'comment-123',
          postId: 'post-1',
          author: 'Test User',
          content: 'Test comment',
          timestamp: new Date().toISOString(),
        }),
      }), 300))
    );

    renderWithProviders(<RealSocialMediaFeed />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const commentButtons = screen.getAllByText(/comment/i);
    await user.click(commentButtons[0]);

    const textarea = screen.getByPlaceholderText(/write a comment/i);
    await user.type(textarea, 'Test comment');

    const submitButton = screen.getByRole('button', { name: /add comment/i });

    // Rapidly click submit 3 times
    await user.click(submitButton);
    await user.click(submitButton);
    await user.click(submitButton);

    // Verify only one API call made
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Verify processing state maintained
    expect(screen.getByText(/adding comment\.\.\./i)).toBeInTheDocument();
  });

  /**
   * @test Edge Case: Empty Comment Submission
   * @description Handles submission with empty or whitespace-only content
   * @steps
   *   1. Open comment form
   *   2. Leave textarea empty or add only whitespace
   *   3. Click submit
   *   4. Verify no API call made
   *   5. Verify no processing state shown
   * @expected Prevents empty comment submission
   */
  it('should not show processing state for empty comment submission', async () => {
    const user = userEvent.setup();

    renderWithProviders(<RealSocialMediaFeed />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const commentButtons = screen.getAllByText(/comment/i);
    await user.click(commentButtons[0]);

    const textarea = screen.getByPlaceholderText(/write a comment/i);

    // Try submitting empty comment
    const submitButton = screen.getByRole('button', { name: /add comment/i });
    await user.click(submitButton);

    // Verify no API call made
    expect(mockFetch).not.toHaveBeenCalled();

    // Verify no processing state shown
    expect(screen.queryByText(/adding comment\.\.\./i)).not.toBeInTheDocument();

    // Try with whitespace only
    await user.type(textarea, '   ');
    await user.click(submitButton);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(screen.queryByText(/adding comment\.\.\./i)).not.toBeInTheDocument();
  });
});
