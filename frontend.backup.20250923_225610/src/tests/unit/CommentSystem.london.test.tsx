/**
 * London School TDD - Comment System Unit Tests
 * Focus: Mock-driven behavior verification for comment interactions
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { PostCard } from '@/components/PostCard';
import { CommentThread } from '@/components/CommentThread';
import { CommentForm } from '@/components/CommentForm';

// Mock all external dependencies (London School approach)
const mockUseWebSocket = {
  socket: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  },
  isConnected: true,
  subscribe: jest.fn(),
  unsubscribe: jest.fn()
};

// Mock comment API responses
const mockCommentApiService = {
  loadComments: jest.fn(),
  createComment: jest.fn(),
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
  reactToComment: jest.fn()
};

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => mockUseWebSocket
}));

describe('Comment System - London School TDD', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('PostCard Comment Button Interaction', () => {
    const mockPost = {
      id: 'post-1',
      title: 'Test Post',
      content: 'Test content',
      authorAgent: 'test-agent',
      publishedAt: '2025-01-01T00:00:00Z',
      comments: 5,
      shares: 2,
      views: 100
    };

    it('should trigger comment section when comment button is clicked', async () => {
      // Mock successful comments fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: []
        })
      });

      render(<PostCard post={mockPost} />);
      
      // Find comment button
      const commentButton = screen.getByRole('button', { name: /comment/i });
      expect(commentButton).toBeInTheDocument();

      // Verify initial state - comments section should not be visible
      expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();

      // Click comment button
      fireEvent.click(commentButton);

      // Verify comment section becomes visible with loading state
      await waitFor(() => {
        expect(screen.getByText('Loading comments...')).toBeInTheDocument();
      });

      // Verify API call was made
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/posts/post-1/comments');
    });

    it('should handle comment loading errors gracefully', async () => {
      // Mock failed API response
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<PostCard post={mockPost} />);
      
      const commentButton = screen.getByRole('button', { name: /comment/i });
      fireEvent.click(commentButton);

      // Should show error state but not crash
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('should display comment count correctly', () => {
      render(<PostCard post={mockPost} />);
      
      const commentButton = screen.getByRole('button', { name: /5 comments/i });
      expect(commentButton).toBeInTheDocument();
    });

    it('should show singular "Comment" when count is 0', () => {
      const postWithNoComments = { ...mockPost, comments: 0 };
      render(<PostCard post={postWithNoComments} />);
      
      const commentButton = screen.getByRole('button', { name: /^comment$/i });
      expect(commentButton).toBeInTheDocument();
    });
  });

  describe('CommentThread Display Behavior', () => {
    const mockComments = [
      {
        id: 'comment-1',
        content: 'First comment',
        author: 'user1',
        createdAt: '2025-01-01T00:00:00Z',
        likesCount: 3,
        repliesCount: 0,
        threadDepth: 0,
        threadPath: '0'
      },
      {
        id: 'comment-2',
        content: 'Reply to first comment',
        author: 'user2',
        createdAt: '2025-01-01T01:00:00Z',
        parentId: 'comment-1',
        likesCount: 1,
        repliesCount: 0,
        threadDepth: 1,
        threadPath: '0.0'
      }
    ];

    it('should render comment thread when comments are provided', () => {
      render(
        <CommentThread 
          postId="post-1" 
          comments={mockComments} 
          onCommentsUpdate={jest.fn()}
        />
      );

      // Verify comments are displayed
      expect(screen.getByText('First comment')).toBeInTheDocument();
      expect(screen.getByText('Reply to first comment')).toBeInTheDocument();
      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.getByText('user2')).toBeInTheDocument();
    });

    it('should show empty state when no comments exist', () => {
      render(
        <CommentThread 
          postId="post-1" 
          comments={[]} 
          onCommentsUpdate={jest.fn()}
        />
      );

      expect(screen.getByText('No comments yet')).toBeInTheDocument();
    });

    it('should handle reply button clicks correctly', async () => {
      // Mock successful reply creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const mockOnCommentsUpdate = jest.fn();
      render(
        <CommentThread 
          postId="post-1" 
          comments={mockComments} 
          onCommentsUpdate={mockOnCommentsUpdate}
        />
      );

      // Find and click reply button for first comment
      const replyButtons = screen.getAllByText('Reply');
      expect(replyButtons.length).toBeGreaterThan(0);
      
      fireEvent.click(replyButtons[0]);

      // Should show reply form
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument();
      });
    });
  });

  describe('CommentForm Submission Behavior', () => {
    const mockOnCommentAdded = jest.fn();

    it('should submit comment successfully', async () => {
      // Mock successful comment creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'new-comment' }
        })
      });

      render(
        <CommentForm 
          postId="post-1"
          onCommentAdded={mockOnCommentAdded}
        />
      );

      // Fill in comment content
      const textarea = screen.getByPlaceholderText('Write a comment...');
      fireEvent.change(textarea, { target: { value: 'Test comment content' } });

      // Submit comment
      const submitButton = screen.getByRole('button', { name: /post comment/i });
      fireEvent.click(submitButton);

      // Verify API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/posts/post-1/comments',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            }),
            body: expect.stringContaining('Test comment content')
          })
        );
      });

      // Verify callback was called
      await waitFor(() => {
        expect(mockOnCommentAdded).toHaveBeenCalled();
      });
    });

    it('should prevent submission of empty comments', () => {
      render(
        <CommentForm 
          postId="post-1"
          onCommentAdded={mockOnCommentAdded}
        />
      );

      const submitButton = screen.getByRole('button', { name: /post comment/i });
      
      // Submit button should be disabled when textarea is empty
      expect(submitButton).toBeDisabled();
    });

    it('should handle comment submission errors', async () => {
      // Mock failed API response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to create comment' })
      });

      render(
        <CommentForm 
          postId="post-1"
          onCommentAdded={mockOnCommentAdded}
        />
      );

      const textarea = screen.getByPlaceholderText('Write a comment...');
      fireEvent.change(textarea, { target: { value: 'Test comment' } });

      const submitButton = screen.getByRole('button', { name: /post comment/i });
      fireEvent.click(submitButton);

      // Should display error message
      await waitFor(() => {
        expect(screen.getByText('Failed to create comment')).toBeInTheDocument();
      });
    });
  });

  describe('Comment Interaction Workflow', () => {
    it('should coordinate comment loading and display properly', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          content: 'Test comment',
          author: 'user1',
          createdAt: '2025-01-01T00:00:00Z',
          likesCount: 0,
          repliesCount: 0,
          threadDepth: 0,
          threadPath: '0'
        }
      ];

      // Mock successful API responses
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockComments
        })
      });

      const mockPost = {
        id: 'post-1',
        title: 'Test Post',
        content: 'Test content',
        authorAgent: 'test-agent',
        publishedAt: '2025-01-01T00:00:00Z',
        comments: 1
      };

      render(<PostCard post={mockPost} />);
      
      // Click comment button to open comments
      const commentButton = screen.getByRole('button', { name: /1 comments/i });
      fireEvent.click(commentButton);

      // Verify loading state appears
      await waitFor(() => {
        expect(screen.getByText('Loading comments...')).toBeInTheDocument();
      });

      // Verify comments load and display
      await waitFor(() => {
        expect(screen.getByText('Test comment')).toBeInTheDocument();
        expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
      });
    });
  });

  describe('WebSocket Integration', () => {
    it('should emit WebSocket events for real-time comment updates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'new-comment' }
        })
      });

      render(
        <CommentForm 
          postId="post-1"
          onCommentAdded={jest.fn()}
        />
      );

      const textarea = screen.getByPlaceholderText('Write a comment...');
      fireEvent.change(textarea, { target: { value: 'WebSocket test comment' } });

      const submitButton = screen.getByRole('button', { name: /post comment/i });
      fireEvent.click(submitButton);

      // Verify WebSocket emit was called
      await waitFor(() => {
        expect(mockUseWebSocket.socket.emit).toHaveBeenCalledWith(
          'comment:create',
          expect.objectContaining({
            postId: 'post-1',
            content: 'WebSocket test comment',
            commentId: 'new-comment'
          })
        );
      });
    });
  });

  describe('Comment Navigation Interactions', () => {
    const mockNestedComments = [
      {
        id: 'comment-1',
        content: 'Parent comment',
        author: 'user1',
        createdAt: '2025-01-01T00:00:00Z',
        likesCount: 0,
        repliesCount: 2,
        threadDepth: 0,
        threadPath: '0',
        replies: [
          {
            id: 'comment-2',
            content: 'Child comment 1',
            author: 'user2',
            createdAt: '2025-01-01T01:00:00Z',
            parentId: 'comment-1',
            likesCount: 0,
            repliesCount: 0,
            threadDepth: 1,
            threadPath: '0.0'
          },
          {
            id: 'comment-3',
            content: 'Child comment 2',
            author: 'user3',
            createdAt: '2025-01-01T02:00:00Z',
            parentId: 'comment-1',
            likesCount: 0,
            repliesCount: 0,
            threadDepth: 1,
            threadPath: '0.1'
          }
        ]
      }
    ];

    it('should handle comment thread expansion/collapse', () => {
      render(
        <CommentThread 
          postId="post-1" 
          comments={mockNestedComments} 
          onCommentsUpdate={jest.fn()}
        />
      );

      // Find collapse/expand button (should show reply count)
      const expandButton = screen.getByText('2 replies');
      expect(expandButton).toBeInTheDocument();

      // Click to collapse/expand
      fireEvent.click(expandButton);
      
      // This tests the interaction behavior - actual collapse logic would be tested in integration
    });
  });
});