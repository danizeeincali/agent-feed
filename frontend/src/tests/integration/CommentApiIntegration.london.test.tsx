/**
 * London School TDD - Comment API Integration Tests
 * Focus: Mock external APIs, test internal component communication
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { PostCard } from '@/components/PostCard';
import { apiService } from '@/services/api';

// Mock the entire API service (London School approach)
jest.mock('@/services/api', () => ({
  apiService: {
    getAgentPosts: jest.fn(),
    savePost: jest.fn(),
    updatePostEngagement: jest.fn(),
    clearCache: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn()
  }
}));

// Mock WebSocket context
const mockWebSocketContext = {
  socket: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  },
  isConnected: true,
  subscribe: jest.fn(),
  unsubscribe: jest.fn()
};

jest.mock('../hooks/useWebSocket', () => ({
  useWebSocket: () => mockWebSocketContext
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Comment API Integration - London School TDD', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Comment Loading Integration', () => {
    const mockPost = {
      id: 'integration-post-1',
      title: 'Integration Test Post',
      content: 'Testing API integration',
      authorAgent: 'test-agent',
      publishedAt: '2025-01-01T00:00:00Z',
      comments: 3
    };

    it('should load comments from API when comment button is clicked', async () => {
      // Mock successful API response
      const mockComments = [
        {
          id: 'api-comment-1',
          content: 'Comment from API',
          author: 'api-user',
          createdAt: '2025-01-01T00:00:00Z',
          likesCount: 5,
          repliesCount: 2
        },
        {
          id: 'api-comment-2',
          content: 'Another API comment',
          author: 'api-user-2',
          createdAt: '2025-01-01T01:00:00Z',
          likesCount: 1,
          repliesCount: 0
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockComments
        })
      });

      render(<PostCard post={mockPost} />);
      
      // Click comment button
      const commentButton = screen.getByRole('button', { name: /3 comments/i });
      fireEvent.click(commentButton);

      // Verify API call was made correctly
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/posts/integration-post-1/comments');
      });

      // Verify comments are displayed after loading
      await waitFor(() => {
        expect(screen.getByText('Comment from API')).toBeInTheDocument();
        expect(screen.getByText('Another API comment')).toBeInTheDocument();
      });
    });

    it('should handle API errors during comment loading', async () => {
      // Mock API error
      mockFetch.mockRejectedValueOnce(new Error('API Error: Comments service unavailable'));

      render(<PostCard post={mockPost} />);
      
      const commentButton = screen.getByRole('button', { name: /3 comments/i });
      fireEvent.click(commentButton);

      // Verify error is handled gracefully (no crash)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Component should remain functional despite API error
      expect(commentButton).toBeInTheDocument();
    });

    it('should cache comments to avoid duplicate API calls', async () => {
      const mockComments = [
        {
          id: 'cached-comment-1',
          content: 'Cached comment',
          author: 'cache-user',
          createdAt: '2025-01-01T00:00:00Z',
          likesCount: 0,
          repliesCount: 0
        }
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockComments
        })
      });

      render(<PostCard post={mockPost} />);
      
      const commentButton = screen.getByRole('button', { name: /3 comments/i });
      
      // First click - should make API call
      fireEvent.click(commentButton);
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Toggle comments off
      fireEvent.click(commentButton);
      
      // Toggle comments on again - should not make another API call (cached)
      fireEvent.click(commentButton);
      
      // Should still be only 1 API call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Comment Creation Integration', () => {
    it('should create new comment via API and update UI', async () => {
      const mockPost = {
        id: 'create-test-post',
        title: 'Comment Creation Test',
        content: 'Test creating comments',
        authorAgent: 'test-agent',
        publishedAt: '2025-01-01T00:00:00Z',
        comments: 0
      };

      // Mock successful comment creation
      const newComment = {
        id: 'new-comment-123',
        content: 'Newly created comment',
        author: 'current-user',
        createdAt: '2025-01-01T10:00:00Z',
        likesCount: 0,
        repliesCount: 0
      };

      // First mock - load empty comments
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: []
          })
        })
        // Second mock - create new comment
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: newComment
          })
        })
        // Third mock - reload comments with new comment
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [newComment]
          })
        });

      render(<PostCard post={mockPost} />);
      
      // Open comment section
      const commentButton = screen.getByRole('button', { name: /comment/i });
      fireEvent.click(commentButton);

      // Wait for comment form to appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Write a comment...')).toBeInTheDocument();
      });

      // Fill and submit comment
      const textarea = screen.getByPlaceholderText('Write a comment...');
      fireEvent.change(textarea, { target: { value: 'Newly created comment' } });

      const submitButton = screen.getByRole('button', { name: /post comment/i });
      fireEvent.click(submitButton);

      // Verify comment creation API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/posts/create-test-post/comments',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            }),
            body: expect.stringContaining('Newly created comment')
          })
        );
      });
    });

    it('should handle comment creation failures', async () => {
      const mockPost = {
        id: 'fail-test-post',
        title: 'Comment Failure Test',
        content: 'Test comment creation failures',
        authorAgent: 'test-agent',
        publishedAt: '2025-01-01T00:00:00Z',
        comments: 0
      };

      // Mock empty comments load, then failed comment creation
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: []
          })
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            error: 'Comment creation failed'
          })
        });

      render(<PostCard post={mockPost} />);
      
      // Open comment section and try to create comment
      const commentButton = screen.getByRole('button', { name: /comment/i });
      fireEvent.click(commentButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Write a comment...')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Write a comment...');
      fireEvent.change(textarea, { target: { value: 'Failed comment' } });

      const submitButton = screen.getByRole('button', { name: /post comment/i });
      fireEvent.click(submitButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Comment creation failed')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Comment Updates Integration', () => {
    it('should emit WebSocket events when comments are created', async () => {
      const mockPost = {
        id: 'websocket-test-post',
        title: 'WebSocket Test',
        content: 'Testing real-time updates',
        authorAgent: 'test-agent',
        publishedAt: '2025-01-01T00:00:00Z',
        comments: 0
      };

      // Mock successful comment creation
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: []
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { id: 'websocket-comment-1' }
          })
        });

      render(<PostCard post={mockPost} />);
      
      // Open comments and create comment
      const commentButton = screen.getByRole('button', { name: /comment/i });
      fireEvent.click(commentButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Write a comment...')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Write a comment...');
      fireEvent.change(textarea, { target: { value: 'WebSocket test comment' } });

      const submitButton = screen.getByRole('button', { name: /post comment/i });
      fireEvent.click(submitButton);

      // Verify WebSocket event was emitted
      await waitFor(() => {
        expect(mockWebSocketContext.socket.emit).toHaveBeenCalledWith(
          'comment:create',
          expect.objectContaining({
            postId: 'websocket-test-post',
            content: 'WebSocket test comment',
            commentId: 'websocket-comment-1'
          })
        );
      });
    });

    it('should subscribe to post-specific comment updates', async () => {
      const mockPost = {
        id: 'subscription-test-post',
        title: 'Subscription Test',
        content: 'Testing WebSocket subscriptions',
        authorAgent: 'test-agent',
        publishedAt: '2025-01-01T00:00:00Z',
        comments: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              id: 'existing-comment',
              content: 'Existing comment',
              author: 'user1',
              createdAt: '2025-01-01T00:00:00Z',
              likesCount: 0,
              repliesCount: 0
            }
          ]
        })
      });

      render(<PostCard post={mockPost} />);
      
      // Open comments to trigger subscription
      const commentButton = screen.getByRole('button', { name: /1 comments/i });
      fireEvent.click(commentButton);

      // Verify WebSocket subscription was set up
      await waitFor(() => {
        expect(mockWebSocketContext.socket.emit).toHaveBeenCalledWith(
          'subscribe:post',
          'subscription-test-post'
        );
      });

      // Verify event handlers were subscribed
      expect(mockWebSocketContext.subscribe).toHaveBeenCalledWith(
        'comment:created',
        expect.any(Function)
      );
      expect(mockWebSocketContext.subscribe).toHaveBeenCalledWith(
        'comment:updated',
        expect.any(Function)
      );
      expect(mockWebSocketContext.subscribe).toHaveBeenCalledWith(
        'comment:deleted',
        expect.any(Function)
      );
    });
  });

  describe('Comment Interaction API Integration', () => {
    it('should handle comment reactions via API', async () => {
      const mockPost = {
        id: 'reaction-test-post',
        title: 'Reaction Test',
        content: 'Testing comment reactions',
        authorAgent: 'test-agent',
        publishedAt: '2025-01-01T00:00:00Z',
        comments: 1
      };

      const mockComments = [
        {
          id: 'reaction-comment',
          content: 'Comment to react to',
          author: 'user1',
          createdAt: '2025-01-01T00:00:00Z',
          likesCount: 0,
          repliesCount: 0,
          threadDepth: 0,
          threadPath: '0'
        }
      ];

      // Mock comment loading and reaction API
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockComments
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { liked: true, likesCount: 1 }
          })
        });

      render(<PostCard post={mockPost} />);
      
      // Open comments
      const commentButton = screen.getByRole('button', { name: /1 comments/i });
      fireEvent.click(commentButton);

      // Wait for comments to load and find reaction button
      await waitFor(() => {
        expect(screen.getByText('Comment to react to')).toBeInTheDocument();
      });

      // Find and click like button (this tests the integration between UI and API)
      const likeButton = screen.getByTitle(/Laugh/i); // CommentReactions component
      if (likeButton) {
        fireEvent.click(likeButton);

        // Verify reaction API call
        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            '/api/v1/comments/reaction-comment/like',
            expect.objectContaining({
              method: 'POST',
              body: expect.stringContaining('userId')
            })
          );
        });
      }
    });
  });
});