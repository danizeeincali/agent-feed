/**
 * SPARC REFINEMENT Phase - TDD London School Threading Tests
 * Comprehensive test suite for comment threading system
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ThreadedCommentSystem from '../../frontend/src/components/ThreadedCommentSystem';
import { apiService } from '../../frontend/src/services/api';

// Mock API service
jest.mock('../../frontend/src/services/api', () => ({
  apiService: {
    request: jest.fn(),
    getPostComments: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  }
}));

const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Mock threaded comment data
const mockThreadedComments = [
  {
    id: 'comment-1',
    post_id: 'post-1',
    parent_id: null,
    thread_id: 'comment-1',
    content: 'This is a root comment that mentions @TechReviewer',
    author: 'ProductionValidator',
    author_type: 'user' as const,
    depth: 0,
    reply_count: 2,
    is_deleted: false,
    created_at: '2024-01-01T12:00:00Z',
    updated_at: '2024-01-01T12:00:00Z',
    replies: [
      {
        id: 'comment-2',
        post_id: 'post-1',
        parent_id: 'comment-1',
        thread_id: 'comment-1',
        content: 'Great analysis! Let me add some technical context.',
        author: 'TechReviewer',
        author_type: 'agent' as const,
        depth: 1,
        reply_count: 1,
        is_deleted: false,
        created_at: '2024-01-01T12:05:00Z',
        updated_at: '2024-01-01T12:05:00Z',
        replies: [
          {
            id: 'comment-3',
            post_id: 'post-1',
            parent_id: 'comment-2',
            thread_id: 'comment-1',
            content: 'Thanks for the feedback! This helps a lot.',
            author: 'ProductionValidator',
            author_type: 'user' as const,
            depth: 2,
            reply_count: 0,
            is_deleted: false,
            created_at: '2024-01-01T12:10:00Z',
            updated_at: '2024-01-01T12:10:00Z',
            replies: []
          }
        ]
      }
    ]
  },
  {
    id: 'comment-4',
    post_id: 'post-1',
    parent_id: null,
    thread_id: 'comment-4',
    content: 'Another root comment for testing',
    author: 'SystemValidator',
    author_type: 'agent' as const,
    depth: 0,
    reply_count: 0,
    is_deleted: false,
    created_at: '2024-01-01T12:15:00Z',
    updated_at: '2024-01-01T12:15:00Z',
    replies: []
  }
];

const mockStatistics = {
  total_comments: 4,
  max_depth: 2,
  unique_participants: 2,
  agent_participants: 2
};

describe('ThreadedCommentSystem', () => {
  const defaultProps = {
    postId: 'post-1',
    maxDepth: 10,
    enableRealTime: false // Disable for testing
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default API responses
    mockApiService.request.mockImplementation((endpoint, options) => {
      if (endpoint.includes('/posts/post-1/comments') && !options?.method) {
        // GET comments
        return Promise.resolve({
          success: true,
          data: mockThreadedComments,
          statistics: mockStatistics
        });
      }
      
      if (endpoint.includes('/posts/post-1/comments') && options?.method === 'POST') {
        // POST new comment
        return Promise.resolve({
          success: true,
          data: {
            id: 'new-comment-id',
            post_id: 'post-1',
            parent_id: null,
            thread_id: 'new-comment-id',
            content: JSON.parse(options.body as string).content,
            author: 'ProductionValidator',
            author_type: 'user',
            depth: 0,
            reply_count: 0,
            is_deleted: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            replies: []
          }
        });
      }
      
      if (endpoint.includes('/comments/') && endpoint.includes('/replies') && options?.method === 'POST') {
        // POST reply
        return Promise.resolve({
          success: true,
          data: {
            id: 'new-reply-id',
            post_id: 'post-1',
            parent_id: endpoint.split('/')[2],
            thread_id: 'comment-1',
            content: JSON.parse(options.body as string).content,
            author: 'ProductionValidator',
            author_type: 'user',
            depth: 1,
            reply_count: 0,
            is_deleted: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            replies: []
          }
        });
      }
      
      return Promise.reject(new Error('Unmocked API call'));
    });

    mockApiService.getPostComments.mockResolvedValue([]);
    mockApiService.on.mockImplementation(() => {});
    mockApiService.off.mockImplementation(() => {});
  });

  describe('Component Rendering', () => {
    test('renders without crashing', async () => {
      render(<ThreadedCommentSystem {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Threading system active')).toBeInTheDocument();
      });
    });

    test('displays thread statistics correctly', async () => {
      render(<ThreadedCommentSystem {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Thread Statistics')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument(); // Total comments
        expect(screen.getByText('2')).toBeInTheDocument(); // Max depth
      });
    });

    test('renders comment composer form', async () => {
      render(<ThreadedCommentSystem {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Start a Discussion')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Share your thoughts or ask a question...')).toBeInTheDocument();
        expect(screen.getByText('Post Comment')).toBeInTheDocument();
      });
    });
  });

  describe('Comment Display', () => {
    test('displays threaded comments in hierarchical structure', async () => {
      render(<ThreadedCommentSystem {...defaultProps} />);
      
      await waitFor(() => {
        // Root comment
        expect(screen.getByText('This is a root comment that mentions @TechReviewer')).toBeInTheDocument();
        
        // Agent reply
        expect(screen.getByText('Great analysis! Let me add some technical context.')).toBeInTheDocument();
        
        // Nested user reply
        expect(screen.getByText('Thanks for the feedback! This helps a lot.')).toBeInTheDocument();
      });
    });

    test('displays author information correctly', async () => {
      render(<ThreadedCommentSystem {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('ProductionValidator')).toBeInTheDocument();
        expect(screen.getByText('TechReviewer')).toBeInTheDocument();
        expect(screen.getByText('SystemValidator')).toBeInTheDocument();
      });
    });

    test('shows agent badges for agent comments', async () => {
      render(<ThreadedCommentSystem {...defaultProps} />);
      
      await waitFor(() => {
        const agentBadges = screen.getAllByText('Agent');
        expect(agentBadges.length).toBeGreaterThan(0);
      });
    });

    test('displays depth indicators for nested comments', async () => {
      render(<ThreadedCommentSystem {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('depth 1')).toBeInTheDocument();
        expect(screen.getByText('depth 2')).toBeInTheDocument();
      });
    });

    test('shows reply counts correctly', async () => {
      render(<ThreadedCommentSystem {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('2 replies')).toBeInTheDocument();
      });
    });
  });

  describe('Comment Interaction', () => {
    test('allows creating new root comments', async () => {
      const user = userEvent.setup();
      render(<ThreadedCommentSystem {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Share your thoughts or ask a question...')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Share your thoughts or ask a question...');
      const submitButton = screen.getByText('Post Comment');

      await user.type(textarea, 'This is a new test comment');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockApiService.request).toHaveBeenCalledWith(
          '/posts/post-1/comments',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              content: 'This is a new test comment',
              author: 'ProductionValidator',
              authorType: 'user'
            })
          })
        );
      });
    });

    test('enables reply functionality', async () => {
      const user = userEvent.setup();
      render(<ThreadedCommentSystem {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('This is a root comment that mentions @TechReviewer')).toBeInTheDocument();
      });

      // Find and click reply button
      const replyButtons = screen.getAllByText('Reply');
      await user.click(replyButtons[0]);

      // Verify reply form appears
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Reply to ProductionValidator/)).toBeInTheDocument();
      });

      // Type reply and submit
      const replyTextarea = screen.getByPlaceholderText(/Reply to ProductionValidator/);
      const replySubmitButton = screen.getByRole('button', { name: /Reply/ });

      await user.type(replyTextarea, 'This is a test reply');
      await user.click(replySubmitButton);

      await waitFor(() => {
        expect(mockApiService.request).toHaveBeenCalledWith(
          '/comments/comment-1/replies',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              content: 'This is a test reply',
              author: 'ProductionValidator',
              authorType: 'user'
            })
          })
        );
      });
    });

    test('allows toggling reply visibility', async () => {
      const user = userEvent.setup();
      render(<ThreadedCommentSystem {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Show 2 replies')).toBeInTheDocument();
      });

      // Click to expand replies
      const showRepliesButton = screen.getByText('Show 2 replies');
      await user.click(showRepliesButton);

      // Replies should be visible and button text should change
      await waitFor(() => {
        expect(screen.getByText('Hide 2 replies')).toBeInTheDocument();
      });
    });

    test('prevents empty comment submission', async () => {
      const user = userEvent.setup();
      render(<ThreadedCommentSystem {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Post Comment')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Post Comment');
      expect(submitButton).toBeDisabled();

      // Try submitting empty comment
      await user.click(submitButton);
      expect(mockApiService.request).not.toHaveBeenCalled();
    });

    test('handles API errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock API failure
      mockApiService.request.mockRejectedValueOnce(new Error('API Error'));
      
      render(<ThreadedCommentSystem {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Share your thoughts or ask a question...')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Share your thoughts or ask a question...');
      const submitButton = screen.getByText('Post Comment');

      await user.type(textarea, 'This should fail');
      await user.click(submitButton);

      // Should handle error gracefully (no crash)
      await waitFor(() => {
        expect(screen.getByText('Post Comment')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    test('registers and unregisters WebSocket event handlers', () => {
      const { unmount } = render(
        <ThreadedCommentSystem {...defaultProps} enableRealTime={true} />
      );

      expect(mockApiService.on).toHaveBeenCalledWith('comment_added', expect.any(Function));
      expect(mockApiService.on).toHaveBeenCalledWith('reply_added', expect.any(Function));

      unmount();

      expect(mockApiService.off).toHaveBeenCalledWith('comment_added', expect.any(Function));
      expect(mockApiService.off).toHaveBeenCalledWith('reply_added', expect.any(Function));
    });

    test('handles real-time comment additions', async () => {
      let commentAddedHandler: Function | null = null;
      
      mockApiService.on.mockImplementation((event, handler) => {
        if (event === 'comment_added') {
          commentAddedHandler = handler;
        }
      });

      render(<ThreadedCommentSystem {...defaultProps} enableRealTime={true} />);
      
      await waitFor(() => {
        expect(commentAddedHandler).toBeDefined();
      });

      // Simulate real-time comment addition
      const newComment = {
        postId: 'post-1',
        comment: {
          id: 'realtime-comment',
          content: 'Real-time comment added',
          author: 'RealtimeUser',
          author_type: 'user',
          depth: 0,
          replies: []
        }
      };

      act(() => {
        commentAddedHandler!(newComment);
      });

      await waitFor(() => {
        expect(screen.getByText('Real-time comment added')).toBeInTheDocument();
      });
    });

    test('handles real-time reply additions', async () => {
      let replyAddedHandler: Function | null = null;
      
      mockApiService.on.mockImplementation((event, handler) => {
        if (event === 'reply_added') {
          replyAddedHandler = handler;
        }
      });

      render(<ThreadedCommentSystem {...defaultProps} enableRealTime={true} />);
      
      await waitFor(() => {
        expect(replyAddedHandler).toBeDefined();
      });

      // Simulate real-time reply addition
      const newReply = {
        postId: 'post-1',
        parentId: 'comment-1',
        reply: {
          id: 'realtime-reply',
          content: 'Real-time reply added',
          author: 'RealtimeUser',
          author_type: 'user',
          depth: 1,
          replies: []
        }
      };

      act(() => {
        replyAddedHandler!(newReply);
      });

      await waitFor(() => {
        expect(screen.getByText('Real-time reply added')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles API failures with fallback', async () => {
      // Mock threading API failure, but fallback success
      mockApiService.request
        .mockRejectedValueOnce(new Error('Threading API failed'))
        .mockResolvedValue([{
          id: 'fallback-comment',
          content: 'Fallback comment',
          author: 'FallbackUser',
          post_id: 'post-1'
        }]);

      render(<ThreadedCommentSystem {...defaultProps} />);

      await waitFor(() => {
        expect(mockApiService.getPostComments).toHaveBeenCalledWith('post-1');
      });
    });

    test('displays empty state when no comments exist', async () => {
      mockApiService.request.mockResolvedValue({
        success: true,
        data: [],
        statistics: {
          total_comments: 0,
          max_depth: 0,
          unique_participants: 0,
          agent_participants: 0
        }
      });

      render(<ThreadedCommentSystem {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No comments yet')).toBeInTheDocument();
        expect(screen.getByText('Be the first to start a discussion!')).toBeInTheDocument();
      });
    });

    test('handles maximum depth limiting', async () => {
      render(<ThreadedCommentSystem {...defaultProps} maxDepth={2} />);
      
      await waitFor(() => {
        expect(screen.getByText('Thread continues with')).toBeInTheDocument();
        expect(screen.getByText('View in separate thread')).toBeInTheDocument();
      });
    });

    test('properly sanitizes and validates comment content', async () => {
      const user = userEvent.setup();
      render(<ThreadedCommentSystem {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Share your thoughts or ask a question...')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Share your thoughts or ask a question...');
      const submitButton = screen.getByText('Post Comment');

      // Test whitespace-only content
      await user.type(textarea, '   ');
      expect(submitButton).toBeDisabled();

      await user.clear(textarea);
      await user.type(textarea, 'Valid content');
      expect(submitButton).toBeEnabled();
    });
  });

  describe('Performance and Memory Management', () => {
    test('cleans up event listeners on unmount', () => {
      const { unmount } = render(
        <ThreadedCommentSystem {...defaultProps} enableRealTime={true} />
      );

      unmount();

      expect(mockApiService.off).toHaveBeenCalledTimes(2);
    });

    test('prevents multiple simultaneous comment submissions', async () => {
      const user = userEvent.setup();
      render(<ThreadedCommentSystem {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Share your thoughts or ask a question...')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Share your thoughts or ask a question...');
      const submitButton = screen.getByText('Post Comment');

      await user.type(textarea, 'Test comment');
      
      // Click submit multiple times rapidly
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Should only make one API call
      await waitFor(() => {
        expect(mockApiService.request).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels and roles', async () => {
      render(<ThreadedCommentSystem {...defaultProps} />);
      
      await waitFor(() => {
        // Forms should have proper labels
        expect(screen.getByRole('textbox')).toHaveProperty('placeholder', 'Share your thoughts or ask a question...');
        
        // Buttons should have proper labels
        expect(screen.getByRole('button', { name: 'Post Comment' })).toBeInTheDocument();
      });
    });

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ThreadedCommentSystem {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Share your thoughts or ask a question...')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Share your thoughts or ask a question...');
      
      // Focus should work with keyboard
      await user.tab();
      expect(textarea).toHaveFocus();
    });
  });
});

describe('Integration with Backend API', () => {
  test('makes correct API calls for comment operations', async () => {
    render(<ThreadedCommentSystem postId="test-post" />);

    await waitFor(() => {
      expect(mockApiService.request).toHaveBeenCalledWith('/posts/test-post/comments', {}, false);
    });
  });

  test('handles complex nested thread structures', async () => {
    const deeplyNestedComments = [
      {
        id: 'root',
        replies: [{
          id: 'depth-1',
          replies: [{
            id: 'depth-2',
            replies: [{
              id: 'depth-3',
              replies: []
            }]
          }]
        }]
      }
    ];

    mockApiService.request.mockResolvedValue({
      success: true,
      data: deeplyNestedComments,
      statistics: mockStatistics
    });

    render(<ThreadedCommentSystem postId="deep-test" maxDepth={5} />);

    await waitFor(() => {
      expect(screen.getByText('depth 1')).toBeInTheDocument();
      expect(screen.getByText('depth 2')).toBeInTheDocument();
      expect(screen.getByText('depth 3')).toBeInTheDocument();
    });
  });
});

// Performance benchmark tests (optional)
describe('Performance Tests', () => {
  test.skip('handles large comment trees efficiently', async () => {
    // Generate large comment tree
    const largeCommentTree = Array.from({ length: 100 }, (_, i) => ({
      id: `comment-${i}`,
      content: `Comment ${i}`,
      author: `User${i}`,
      depth: 0,
      replies: Array.from({ length: 10 }, (_, j) => ({
        id: `reply-${i}-${j}`,
        content: `Reply ${j} to comment ${i}`,
        author: `User${i}${j}`,
        depth: 1,
        replies: []
      }))
    }));

    const startTime = performance.now();
    
    mockApiService.request.mockResolvedValue({
      success: true,
      data: largeCommentTree,
      statistics: mockStatistics
    });

    render(<ThreadedCommentSystem postId="large-test" />);

    await waitFor(() => {
      expect(screen.getByText('Comment 0')).toBeInTheDocument();
    });

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render large trees in reasonable time (< 1000ms)
    expect(renderTime).toBeLessThan(1000);
  });
});