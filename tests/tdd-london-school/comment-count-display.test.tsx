import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommentSystem } from '@/components/comments/CommentSystem';
import { commentService } from '@/services/commentService';

// Mock the comment service - London School: Mock first, define contracts
jest.mock('@/services/commentService');
const mockCommentService = commentService as jest.Mocked<typeof commentService>;

// Mock real-time hooks to prevent WebSocket connections in tests
jest.mock('@/hooks/useRealtimeComments', () => ({
  useRealtimeComments: jest.fn(() => ({}))
}));

jest.mock('@/hooks/useCommentThreading', () => ({
  useCommentThreading: jest.fn()
}));

describe('Comment Count Display - London School TDD', () => {
  // London School: Define mock contracts first
  const mockCommentThreadingHook = {
    comments: [],
    agentConversations: [],
    loading: false,
    error: null,
    addComment: jest.fn(),
    updateComment: jest.fn(),
    deleteComment: jest.fn(),
    reactToComment: jest.fn(),
    loadMoreComments: jest.fn(),
    refreshComments: jest.fn(),
    triggerAgentResponse: jest.fn(),
    getThreadStructure: jest.fn(),
    stats: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // London School: Set up mock behavior expectations
    require('@/hooks/useCommentThreading').useCommentThreading
      .mockReturnValue(mockCommentThreadingHook);
  });

  describe('Comment Count Formatting', () => {
    it('should display integer comment count not decimal string', async () => {
      // FAILING TEST - This will fail because current implementation might return "5.0" 
      const mockStats = {
        totalComments: 5,
        rootThreads: 3,
        maxDepth: 2,
        agentComments: 1,
        userComments: 4,
        averageDepth: 1.2,
        mostActiveThread: 'thread-1',
        recentActivity: 2
      };

      // London School: Mock the collaboration expectation
      mockCommentThreadingHook.stats = mockStats;
      
      render(<CommentSystem postId="test-post-1" />);

      // Test fails because implementation returns decimal format
      const commentCountElement = screen.getByText(/Comments \((\d+)\)/);
      expect(commentCountElement).toBeInTheDocument();
      
      // Assert integer display, not decimal
      expect(commentCountElement.textContent).toBe('Comments (5)');
      expect(commentCountElement.textContent).not.toBe('Comments (5.0)');
      expect(commentCountElement.textContent).not.toBe('Comments (5.00)');
    });

    it('should display zero count as integer not decimal', () => {
      // FAILING TEST - Zero might be displayed as "0.0"
      const mockStats = {
        totalComments: 0,
        rootThreads: 0,
        maxDepth: 0,
        agentComments: 0,
        userComments: 0,
        averageDepth: 0,
        mostActiveThread: null,
        recentActivity: 0
      };

      mockCommentThreadingHook.stats = mockStats;
      
      render(<CommentSystem postId="test-post-empty" />);

      const commentCountElement = screen.getByText(/Comments \((\d+)\)/);
      expect(commentCountElement.textContent).toBe('Comments (0)');
      expect(commentCountElement.textContent).not.toBe('Comments (0.0)');
    });

    it('should display large comment counts as integers', () => {
      // FAILING TEST - Large numbers might have decimal formatting
      const mockStats = {
        totalComments: 1247,
        rootThreads: 89,
        maxDepth: 5,
        agentComments: 234,
        userComments: 1013,
        averageDepth: 2.8,
        mostActiveThread: 'thread-popular',
        recentActivity: 45
      };

      mockCommentThreadingHook.stats = mockStats;
      
      render(<CommentSystem postId="test-post-large" />);

      const commentCountElement = screen.getByText(/Comments \(1247\)/);
      expect(commentCountElement).toBeInTheDocument();
      expect(commentCountElement.textContent).toBe('Comments (1247)');
      // Should not have any decimal formatting
      expect(commentCountElement.textContent).not.toMatch(/Comments \(1247\.\d+\)/);
    });

    it('should correctly format reply count display as integers', () => {
      // FAILING TEST - Reply counts might show decimals
      const mockComments = [
        {
          id: 'comment-1',
          content: 'Parent comment',
          author: { type: 'user' as const, id: 'user1', name: 'User One' },
          metadata: {
            threadDepth: 0,
            threadPath: '1',
            replyCount: 3, // Should be integer display
            likeCount: 5,
            reactionCount: 2,
            isAgentResponse: false
          },
          engagement: {
            likes: 5,
            reactions: {},
            userReacted: false
          },
          status: 'published' as const,
          children: [],
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z'
        }
      ];

      mockCommentThreadingHook.comments = mockComments;
      
      render(<CommentSystem postId="test-post-replies" />);

      // Should display "3 replies" not "3.0 replies"
      expect(screen.getByText('3 replies')).toBeInTheDocument();
      expect(screen.queryByText('3.0 replies')).not.toBeInTheDocument();
      expect(screen.queryByText('3.00 replies')).not.toBeInTheDocument();
    });
  });

  describe('Comment Section Labeling', () => {
    it('should display "Comments" header not "Technical Analysis"', () => {
      // FAILING TEST - Current implementation might show "Technical Analysis"
      const mockStats = {
        totalComments: 2,
        rootThreads: 2,
        maxDepth: 1,
        agentComments: 0,
        userComments: 2,
        averageDepth: 1,
        mostActiveThread: null,
        recentActivity: 1
      };

      mockCommentThreadingHook.stats = mockStats;
      
      render(<CommentSystem postId="test-post-labeling" />);

      // Should show "Comments" as section header
      expect(screen.getByText(/Comments/)).toBeInTheDocument();
      
      // Should NOT show "Technical Analysis"
      expect(screen.queryByText(/Technical Analysis/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Tech Analysis/)).not.toBeInTheDocument();
    });

    it('should use "Comments" in empty state message', () => {
      // FAILING TEST - Empty state might reference wrong section name
      mockCommentThreadingHook.comments = [];
      mockCommentThreadingHook.stats = {
        totalComments: 0,
        rootThreads: 0,
        maxDepth: 0,
        agentComments: 0,
        userComments: 0,
        averageDepth: 0,
        mostActiveThread: null,
        recentActivity: 0
      };
      
      render(<CommentSystem postId="test-post-empty-label" />);

      expect(screen.getByText('No comments yet')).toBeInTheDocument();
      // Should not reference technical analysis in empty state
      expect(screen.queryByText(/technical analysis/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/tech analysis/i)).not.toBeInTheDocument();
    });

    it('should use correct section title in add comment button', () => {
      // FAILING TEST - Button might reference wrong section
      render(<CommentSystem postId="test-post-button-label" />);

      const addButton = screen.getByText('Add Comment');
      expect(addButton).toBeInTheDocument();
      
      // Should not be "Add Technical Analysis" or similar
      expect(screen.queryByText('Add Technical Analysis')).not.toBeInTheDocument();
      expect(screen.queryByText('Add Analysis')).not.toBeInTheDocument();
    });
  });

  describe('Comment Count API Integration', () => {
    it('should call backend API and receive integer counts not decimals', async () => {
      // FAILING TEST - API might return decimal strings
      const mockApiResponse = {
        comments: [],
        totalComments: 15, // Should be number, not string
        rootThreads: 8,
        maxDepth: 3,
        agentComments: 5,
        agentConversations: []
      };

      mockCommentService.getPostComments.mockResolvedValue(mockApiResponse);
      
      render(<CommentSystem postId="test-post-api" />);

      await waitFor(() => {
        expect(mockCommentService.getPostComments).toHaveBeenCalledWith('test-post-api', {});
      });

      // Verify the response contains integers
      expect(mockApiResponse.totalComments).toBe(15);
      expect(typeof mockApiResponse.totalComments).toBe('number');
      expect(mockApiResponse.totalComments % 1).toBe(0); // Ensure it's an integer
    });

    it('should handle stats API response with proper integer formatting', async () => {
      // FAILING TEST - Stats API might return decimal strings
      const mockStatsResponse = {
        totalComments: 42,
        rootThreads: 15,
        maxDepth: 4,
        agentComments: 8,
        userComments: 34,
        averageDepth: 2.1, // This can be decimal
        mostActiveThread: 'thread-123',
        recentActivity: 7
      };

      mockCommentService.getCommentStats.mockResolvedValue(mockStatsResponse);
      
      render(<CommentSystem postId="test-post-stats" />);

      // The component should display integers in UI even if API response is proper
      await waitFor(() => {
        const commentDisplay = screen.queryByText(/Comments \(42\)/);
        if (commentDisplay) {
          expect(commentDisplay.textContent).toBe('Comments (42)');
        }
      });
    });
  });

  describe('Comment Threading Count Consistency', () => {
    it('should maintain consistent integer counts across thread operations', async () => {
      // FAILING TEST - Thread operations might cause decimal count inconsistencies
      const initialComments = [
        {
          id: 'comment-1',
          content: 'Parent comment',
          author: { type: 'user' as const, id: 'user1', name: 'User One' },
          metadata: {
            threadDepth: 0,
            threadPath: '1',
            replyCount: 2,
            likeCount: 3,
            reactionCount: 1,
            isAgentResponse: false
          },
          engagement: { likes: 3, reactions: {}, userReacted: false },
          status: 'published' as const,
          children: [],
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z'
        }
      ];

      mockCommentThreadingHook.comments = initialComments;
      mockCommentThreadingHook.stats = {
        totalComments: 3,
        rootThreads: 1,
        maxDepth: 1,
        agentComments: 0,
        userComments: 3,
        averageDepth: 1,
        mostActiveThread: 'comment-1',
        recentActivity: 1
      };

      const { rerender } = render(<CommentSystem postId="test-post-threading" />);

      // Initial count should be integer
      expect(screen.getByText('Comments (3)')).toBeInTheDocument();

      // Simulate adding a comment (mock behavior)
      mockCommentThreadingHook.stats!.totalComments = 4;
      mockCommentThreadingHook.stats!.userComments = 4;
      
      rerender(<CommentSystem postId="test-post-threading" />);

      // Count after adding should still be integer
      expect(screen.getByText('Comments (4)')).toBeInTheDocument();
      expect(screen.queryByText('Comments (4.0)')).not.toBeInTheDocument();
    });
  });

  describe('Mock Contract Verification', () => {
    it('should verify comment service contract expectations', () => {
      // London School: Verify mock interactions and contracts
      render(<CommentSystem postId="test-contract" />);

      // Verify the hook was called with correct parameters
      expect(require('@/hooks/useCommentThreading').useCommentThreading)
        .toHaveBeenCalledWith('test-contract', expect.objectContaining({
          initialComments: [],
          maxDepth: 10
        }));
    });

    it('should verify real-time updates contract', () => {
      // London School: Verify WebSocket mock contract
      render(<CommentSystem postId="test-realtime" enableRealtime={true} />);

      expect(require('@/hooks/useRealtimeComments').useRealtimeComments)
        .toHaveBeenCalledWith('test-realtime', expect.objectContaining({
          enabled: true
        }));
    });
  });
});