/**
 * TDD London School: Comment Interaction Contracts & Mock Validation
 * 
 * Focus: Testing the interactions between comment components and external
 * dependencies using mock contracts to define expected behavior.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { CommentThread, Comment } from '@/components/CommentThread';
import { CommentForm } from '@/components/CommentForm';
import { apiService } from '@/services/api';

// Complete mock of API service with interaction tracking
vi.mock('@/services/api', () => ({
  apiService: {
    createComment: vi.fn(),
    getPostComments: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }
}));

// Mock utilities
vi.mock('@/utils/commentUtils', () => ({
  buildCommentTree: vi.fn(),
  extractMentions: vi.fn(() => []),
}));

// Mock DOM APIs
const mockScrollIntoView = vi.fn();
const mockWriteText = vi.fn();
const mockGetElementById = vi.fn();

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: mockScrollIntoView,
  writable: true,
});

Object.assign(navigator, {
  clipboard: { writeText: mockWriteText },
});

Object.defineProperty(document, 'getElementById', {
  value: mockGetElementById,
  writable: true,
});

describe('CommentThread - TDD London School: Interaction Contracts', () => {
  const mockApiService = apiService as vi.Mocked<typeof apiService>;
  
  // Contract-based mock factory
  const createCommentMock = (overrides: Partial<Comment> = {}): Comment => ({
    id: 'test-comment-123',
    content: 'Test comment content',
    author: 'test-author',
    createdAt: new Date('2023-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2023-01-01T00:00:00Z').toISOString(),
    parentId: undefined,
    replies: [],
    repliesCount: 0,
    threadDepth: 0,
    threadPath: 'root',
    edited: false,
    isDeleted: false,
    isPinned: false,
    isModerated: false,
    authorType: 'user' as const,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockScrollIntoView.mockClear();
    mockWriteText.mockClear();
    mockGetElementById.mockClear();
  });

  describe('API Contract Verification', () => {
    it('should call createComment API with correct contract parameters', async () => {
      const mockResponse = { id: 'new-comment-456', success: true };
      mockApiService.createComment.mockResolvedValue(mockResponse);
      
      const onCommentsUpdate = vi.fn();
      
      render(
        <CommentForm
          postId="test-post-123"
          currentUser="test-user"
          onCommentAdded={onCommentsUpdate}
        />
      );
      
      // Interact with form
      const textarea = screen.getByPlaceholderText(/provide technical analysis/i);
      const submitButton = screen.getByText(/post analysis/i);
      
      await userEvent.type(textarea, 'Test comment content');
      await userEvent.click(submitButton);
      
      // Verify API contract adherence
      await waitFor(() => {
        expect(mockApiService.createComment).toHaveBeenCalledWith(
          'test-post-123',
          'Test comment content',
          expect.objectContaining({
            author: 'test-user',
            mentionedUsers: expect.any(Array),
          })
        );
      });
      
      expect(onCommentsUpdate).toHaveBeenCalledTimes(1);
    });

    it('should handle API error responses according to contract', async () => {
      const mockError = new Error('API Error: Comment creation failed');
      mockApiService.createComment.mockRejectedValue(mockError);
      
      render(
        <CommentForm
          postId="test-post"
          currentUser="test-user"
        />
      );
      
      const textarea = screen.getByPlaceholderText(/provide technical analysis/i);
      const submitButton = screen.getByText(/post analysis/i);
      
      await userEvent.type(textarea, 'Test content');
      await userEvent.click(submitButton);
      
      // Should display error message
      await waitFor(() => {
        expect(screen.getByText(/failed to post technical analysis/i)).toBeInTheDocument();
      });
      
      // Form should remain in error state
      expect(textarea).toHaveValue('Test content');
    });

    it('should respect API rate limiting and loading states', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      mockApiService.createComment.mockReturnValue(pendingPromise);
      
      render(
        <CommentForm
          postId="test-post"
          currentUser="test-user"
        />
      );
      
      const textarea = screen.getByPlaceholderText(/provide technical analysis/i);
      const submitButton = screen.getByText(/post analysis/i);
      
      await userEvent.type(textarea, 'Test content');
      await userEvent.click(submitButton);
      
      // Should show loading state
      expect(screen.getByText(/analyzing/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      
      // Resolve the promise
      resolvePromise!({ id: 'new-comment' });
      
      await waitFor(() => {
        expect(screen.getByText(/post analysis/i)).toBeInTheDocument();
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Component Collaboration Contracts', () => {
    it('should coordinate between CommentForm and CommentThread correctly', async () => {
      const comments = [createCommentMock()];
      const onCommentsUpdate = vi.fn();
      mockApiService.createComment.mockResolvedValue({ id: 'reply-123' });
      
      render(
        <CommentThread
          postId="test-post"
          comments={comments}
          currentUser="test-user"
          onCommentsUpdate={onCommentsUpdate}
        />
      );
      
      // Initiate reply interaction
      const replyButton = screen.getByText('Reply');
      await userEvent.click(replyButton);
      
      // Should show nested form
      const replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      expect(replyTextarea).toBeInTheDocument();
      
      // Submit reply
      await userEvent.type(replyTextarea, 'Test reply');
      const postReplyButton = screen.getByText(/post reply/i);
      await userEvent.click(postReplyButton);
      
      // Verify contract between components
      await waitFor(() => {
        expect(mockApiService.createComment).toHaveBeenCalledWith(
          'test-post',
          'Test reply',
          expect.objectContaining({
            parentId: 'test-comment-123'
          })
        );
      });
      
      expect(onCommentsUpdate).toHaveBeenCalled();
    });

    it('should manage thread state consistently across component boundaries', () => {
      const parentComment = createCommentMock({ id: 'parent' });
      const childComment = createCommentMock({ 
        id: 'child',
        parentId: 'parent',
        threadDepth: 1 
      });
      
      parentComment.replies = [childComment];
      parentComment.repliesCount = 1;
      
      const { rerender } = render(
        <CommentThread
          postId="test-post"
          comments={[parentComment]}
          currentUser="test-user"
        />
      );
      
      // Collapse thread
      const collapseButton = screen.getByText(/1 reply/);
      fireEvent.click(collapseButton);
      
      // State should persist across re-renders
      rerender(
        <CommentThread
          postId="test-post"
          comments={[parentComment]}
          currentUser="test-user"
        />
      );
      
      // Verify collapsed state maintained
      const childElement = document.getElementById('comment-child');
      expect(childElement).toHaveClass('opacity-0');
    });
  });

  describe('Event Handling Contracts', () => {
    it('should handle scroll events with proper timing and parameters', async () => {
      const comments = [createCommentMock({ id: 'scroll-target' })];
      const mockElement = document.createElement('div');
      mockGetElementById.mockReturnValue(mockElement);
      
      render(
        <CommentThread
          postId="test-post"
          comments={comments}
          currentUser="test-user"
        />
      );
      
      // Trigger highlight (which should scroll)
      const highlightButton = screen.getByText('Highlight');
      await userEvent.click(highlightButton);
      
      // Verify scroll contract
      await waitFor(() => {
        expect(mockGetElementById).toHaveBeenCalledWith('comment-scroll-target');
        expect(mockScrollIntoView).toHaveBeenCalledWith({
          behavior: 'smooth',
          block: 'center'
        });
      });
    });

    it('should handle clipboard operations with proper error boundaries', async () => {
      const comments = [createCommentMock()];
      mockWriteText.mockResolvedValue(undefined);
      
      render(
        <CommentThread
          postId="test-post"
          comments={comments}
          currentUser="test-user"
        />
      );
      
      const permalinkButton = screen.getByTitle('Copy permalink');
      await userEvent.click(permalinkButton);
      
      expect(mockWriteText).toHaveBeenCalledWith(
        expect.stringMatching(/.*#comment-test-comment-123$/)
      );
    });

    it('should handle keyboard navigation contracts correctly', async () => {
      const comments = [createCommentMock()];
      
      render(
        <CommentThread
          postId="test-post"
          comments={comments}
          currentUser="test-user"
        />
      );
      
      const replyButton = screen.getByText('Reply');
      
      // Test keyboard activation
      replyButton.focus();
      await userEvent.keyboard('{Enter}');
      
      // Should activate reply form
      expect(screen.getByPlaceholderText(/write a reply/i)).toBeInTheDocument();
    });
  });

  describe('Validation and Error Handling Contracts', () => {
    it('should validate comment content according to business rules', async () => {
      render(
        <CommentForm
          postId="test-post"
          currentUser="test-user"
          maxLength={100}
        />
      );
      
      const textarea = screen.getByPlaceholderText(/provide technical analysis/i);
      const submitButton = screen.getByText(/post analysis/i);
      
      // Test empty content validation
      await userEvent.click(submitButton);
      expect(screen.getByText(/comment content is required/i)).toBeInTheDocument();
      
      // Test length validation
      const longContent = 'a'.repeat(101);
      await userEvent.type(textarea, longContent);
      await userEvent.click(submitButton);
      
      expect(screen.getByText(/must be under 100 characters/i)).toBeInTheDocument();
    });

    it('should handle malformed comment data gracefully', () => {
      const malformedComment = {
        id: 'malformed',
        // Missing required fields
      } as Comment;
      
      expect(() => {
        render(
          <CommentThread
            postId="test-post"
            comments={[malformedComment]}
            currentUser="test-user"
          />
        );
      }).not.toThrow();
    });
  });

  describe('Performance and Memory Contracts', () => {
    it('should clean up event listeners and prevent memory leaks', () => {
      const onCommentsUpdate = vi.fn();
      
      const { unmount } = render(
        <CommentThread
          postId="test-post"
          comments={[]}
          currentUser="test-user"
          onCommentsUpdate={onCommentsUpdate}
          enableRealTime={true}
        />
      );
      
      // Verify WebSocket event listeners are set up
      expect(mockApiService.on).toHaveBeenCalledWith(
        'posts_updated', 
        expect.any(Function)
      );
      
      // Unmount component
      unmount();
      
      // Verify cleanup
      expect(mockApiService.off).toHaveBeenCalledWith(
        'posts_updated',
        expect.any(Function)
      );
    });

    it('should optimize re-renders using proper memoization contracts', () => {
      const comments = [createCommentMock()];
      const onCommentsUpdate = vi.fn();
      
      const { rerender } = render(
        <CommentThread
          postId="test-post"
          comments={comments}
          currentUser="test-user"
          onCommentsUpdate={onCommentsUpdate}
        />
      );
      
      // Re-render with same props
      rerender(
        <CommentThread
          postId="test-post"
          comments={comments}
          currentUser="test-user"
          onCommentsUpdate={onCommentsUpdate}
        />
      );
      
      // Should not trigger unnecessary API calls
      expect(mockApiService.createComment).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility Contracts', () => {
    it('should maintain proper ARIA relationships in threaded structure', () => {
      const parentComment = createCommentMock({ id: 'parent' });
      const childComment = createCommentMock({ 
        id: 'child',
        parentId: 'parent',
        threadDepth: 1
      });
      
      parentComment.replies = [childComment];
      
      render(
        <CommentThread
          postId="test-post"
          comments={[parentComment]}
          currentUser="test-user"
        />
      );
      
      // Check for proper labeling
      expect(screen.getByLabelText(/expand post/i)).toBeInTheDocument();
      expect(screen.getByTitle(/go to parent/i)).toBeInTheDocument();
    });

    it('should support screen reader navigation of comment hierarchy', () => {
      const nestedComments = [
        createCommentMock({ id: 'level-0' }),
        createCommentMock({ id: 'level-1', parentId: 'level-0', threadDepth: 1 }),
      ];
      
      render(
        <CommentThread
          postId="test-post"
          comments={nestedComments}
          currentUser="test-user"
        />
      );
      
      // Verify hierarchical structure is announced
      expect(screen.getByText('L1')).toBeInTheDocument(); // Depth indicator
    });
  });
});
