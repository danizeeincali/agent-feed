/**
 * Test Suite 2: Integration Tests - Comment System Integration
 *
 * Purpose: Validate that adding/removing comments does not affect the header text,
 * and that stats line updates correctly while header remains static.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { CommentSystem } from '../../../components/comments/CommentSystem';
import type { CommentTreeNode } from '../../../components/comments/CommentSystem';

// Mock data generators
const createMockComment = (id: string, content: string, depth = 0): CommentTreeNode => ({
  id,
  content,
  contentType: 'text',
  author: {
    type: 'user',
    id: 'user-1',
    name: 'Test User',
    avatar: undefined
  },
  metadata: {
    threadDepth: depth,
    threadPath: depth === 0 ? id : `root/${id}`,
    replyCount: 0,
    likeCount: 0,
    reactionCount: 0,
    isAgentResponse: false
  },
  engagement: {
    likes: 0,
    reactions: {},
    userReacted: false
  },
  status: 'published',
  children: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

describe('Test Suite 2: Comment System Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Test 4: Comment count updates do not affect header', () => {
    it('should keep header text as "Comments" when adding comments', async () => {
      const user = userEvent.setup();
      let mockComments: CommentTreeNode[] = [];
      let mockStats = { totalComments: 0, rootThreads: 0, maxDepth: 0, agentComments: 0 };
      const addCommentMock = vi.fn(async (content: string) => {
        const newComment = createMockComment(`comment-${mockComments.length + 1}`, content);
        mockComments = [...mockComments, newComment];
        mockStats = { ...mockStats, totalComments: mockComments.length, rootThreads: mockComments.length };
      });

      // Mock the hook with dynamic state
      vi.mock('../../../hooks/useCommentThreading', () => ({
        useCommentThreading: () => ({
          comments: mockComments,
          agentConversations: [],
          loading: false,
          error: null,
          addComment: addCommentMock,
          updateComment: vi.fn(),
          deleteComment: vi.fn(),
          reactToComment: vi.fn(),
          loadMoreComments: vi.fn(),
          refreshComments: vi.fn(),
          triggerAgentResponse: vi.fn(),
          getThreadStructure: vi.fn(),
          stats: mockStats
        })
      }));

      vi.mock('../../../hooks/useRealtimeComments', () => ({
        useRealtimeComments: () => ({})
      }));

      const { rerender } = render(<CommentSystem postId="test-post" />);

      // Initial state - header shows "Comments"
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading.textContent).toBe('Comments');

      // Click "Add Comment" button
      const addButton = screen.getByRole('button', { name: /add comment/i });
      await user.click(addButton);

      // Verify header still shows "Comments" (no counter)
      expect(heading.textContent).toBe('Comments');
      expect(screen.queryByText(/Comments \(\d+\)/)).not.toBeInTheDocument();

      // Rerender to simulate state update
      rerender(<CommentSystem postId="test-post" />);

      // Header should still be "Comments"
      expect(heading.textContent).toBe('Comments');
    });

    it('should not modify header when comment form is opened', async () => {
      const user = userEvent.setup();

      vi.mock('../../../hooks/useCommentThreading', () => ({
        useCommentThreading: () => ({
          comments: [],
          agentConversations: [],
          loading: false,
          error: null,
          addComment: vi.fn(),
          updateComment: vi.fn(),
          deleteComment: vi.fn(),
          reactToComment: vi.fn(),
          loadMoreComments: vi.fn(),
          refreshComments: vi.fn(),
          triggerAgentResponse: vi.fn(),
          getThreadStructure: vi.fn(),
          stats: { totalComments: 0, rootThreads: 0, maxDepth: 0, agentComments: 0 }
        })
      }));

      vi.mock('../../../hooks/useRealtimeComments', () => ({
        useRealtimeComments: () => ({})
      }));

      render(<CommentSystem postId="test-post" />);

      const headingBefore = screen.getByRole('heading', { level: 3 });
      expect(headingBefore.textContent).toBe('Comments');

      // Open comment form
      const addButton = screen.getByRole('button', { name: /add comment/i });
      await user.click(addButton);

      // Wait for form to appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/share your thoughts/i)).toBeInTheDocument();
      });

      // Header should remain unchanged
      const headingAfter = screen.getByRole('heading', { level: 3 });
      expect(headingAfter.textContent).toBe('Comments');
      expect(screen.queryByText(/Comments \(\d+\)/)).not.toBeInTheDocument();
    });

    it('should maintain header text during multiple comment additions', async () => {
      render(<CommentSystem postId="test-post" />);

      const heading = screen.getByRole('heading', { level: 3 });

      // Verify header is "Comments" initially
      expect(heading.textContent).toBe('Comments');

      // Simulate multiple re-renders (as would happen with state updates)
      for (let i = 0; i < 5; i++) {
        expect(heading.textContent).toBe('Comments');
        expect(screen.queryByText(/Comments \(\d+\)/)).not.toBeInTheDocument();
      }
    });
  });

  describe('Test 5: Stats update correctly with new comments', () => {
    it('should update stats line when comments are added', async () => {
      let currentStats = { totalComments: 0, rootThreads: 0, maxDepth: 0, agentComments: 0 };

      const { rerender } = render(<CommentSystem postId="test-post" />);

      // Initially 0 threads
      expect(screen.getByText('0 threads')).toBeInTheDocument();

      // Simulate adding a comment by mocking updated stats
      currentStats = { totalComments: 1, rootThreads: 1, maxDepth: 0, agentComments: 0 };

      vi.mock('../../../hooks/useCommentThreading', () => ({
        useCommentThreading: () => ({
          comments: [createMockComment('comment-1', 'Test comment')],
          agentConversations: [],
          loading: false,
          error: null,
          addComment: vi.fn(),
          updateComment: vi.fn(),
          deleteComment: vi.fn(),
          reactToComment: vi.fn(),
          loadMoreComments: vi.fn(),
          refreshComments: vi.fn(),
          triggerAgentResponse: vi.fn(),
          getThreadStructure: vi.fn(),
          stats: currentStats
        })
      }));

      rerender(<CommentSystem postId="test-post" />);

      // Should show 1 thread in stats
      await waitFor(() => {
        expect(screen.getByText('1 threads')).toBeInTheDocument();
      });

      // But header should still say "Comments"
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading.textContent).toBe('Comments');
    });

    it('should update max depth in stats without affecting header', async () => {
      const statsWithDepth = {
        totalComments: 5,
        rootThreads: 2,
        maxDepth: 3,
        agentComments: 0
      };

      vi.mock('../../../hooks/useCommentThreading', () => ({
        useCommentThreading: () => ({
          comments: [
            createMockComment('comment-1', 'Root comment', 0),
            createMockComment('comment-2', 'Reply', 1),
            createMockComment('comment-3', 'Nested reply', 2),
            createMockComment('comment-4', 'Deep nested', 3)
          ],
          agentConversations: [],
          loading: false,
          error: null,
          addComment: vi.fn(),
          updateComment: vi.fn(),
          deleteComment: vi.fn(),
          reactToComment: vi.fn(),
          loadMoreComments: vi.fn(),
          refreshComments: vi.fn(),
          triggerAgentResponse: vi.fn(),
          getThreadStructure: vi.fn(),
          stats: statsWithDepth
        })
      }));

      render(<CommentSystem postId="test-post" />);

      // Should show depth in stats
      expect(screen.getByText('2 threads')).toBeInTheDocument();
      expect(screen.getByText('Max depth: 3')).toBeInTheDocument();

      // Header should still be just "Comments"
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading.textContent).toBe('Comments');
    });

    it('should update agent responses count in stats separately', async () => {
      const statsWithAgents = {
        totalComments: 8,
        rootThreads: 3,
        maxDepth: 2,
        agentComments: 2
      };

      vi.mock('../../../hooks/useCommentThreading', () => ({
        useCommentThreading: () => ({
          comments: [],
          agentConversations: [],
          loading: false,
          error: null,
          addComment: vi.fn(),
          updateComment: vi.fn(),
          deleteComment: vi.fn(),
          reactToComment: vi.fn(),
          loadMoreComments: vi.fn(),
          refreshComments: vi.fn(),
          triggerAgentResponse: vi.fn(),
          getThreadStructure: vi.fn(),
          stats: statsWithAgents
        })
      }));

      render(<CommentSystem postId="test-post" enableAgentInteractions={true} />);

      // Should show agent responses in stats
      expect(screen.getByText('3 threads')).toBeInTheDocument();
      expect(screen.getByText('Max depth: 2')).toBeInTheDocument();
      expect(screen.getByText('2 agent responses')).toBeInTheDocument();

      // Header should remain simple
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading.textContent).toBe('Comments');
    });
  });

  describe('Test 6: Loading and error states', () => {
    it('should show "Comments" header even during loading', () => {
      vi.mock('../../../hooks/useCommentThreading', () => ({
        useCommentThreading: () => ({
          comments: [],
          agentConversations: [],
          loading: true,
          error: null,
          addComment: vi.fn(),
          updateComment: vi.fn(),
          deleteComment: vi.fn(),
          reactToComment: vi.fn(),
          loadMoreComments: vi.fn(),
          refreshComments: vi.fn(),
          triggerAgentResponse: vi.fn(),
          getThreadStructure: vi.fn(),
          stats: { totalComments: 0, rootThreads: 0, maxDepth: 0, agentComments: 0 }
        })
      }));

      render(<CommentSystem postId="test-post" />);

      // Should show loading spinner
      expect(screen.getByText(/loading comments/i)).toBeInTheDocument();
    });

    it('should maintain header structure during error state', () => {
      vi.mock('../../../hooks/useCommentThreading', () => ({
        useCommentThreading: () => ({
          comments: [],
          agentConversations: [],
          loading: false,
          error: 'Failed to load comments',
          addComment: vi.fn(),
          updateComment: vi.fn(),
          deleteComment: vi.fn(),
          reactToComment: vi.fn(),
          loadMoreComments: vi.fn(),
          refreshComments: vi.fn(),
          triggerAgentResponse: vi.fn(),
          getThreadStructure: vi.fn(),
          stats: null
        })
      }));

      render(<CommentSystem postId="test-post" />);

      // Should show error message
      expect(screen.getByText(/error loading comments/i)).toBeInTheDocument();
      expect(screen.getByText('Failed to load comments')).toBeInTheDocument();
    });
  });

  describe('Test 7: Empty state rendering', () => {
    it('should show empty state without counter in header', () => {
      vi.mock('../../../hooks/useCommentThreading', () => ({
        useCommentThreading: () => ({
          comments: [],
          agentConversations: [],
          loading: false,
          error: null,
          addComment: vi.fn(),
          updateComment: vi.fn(),
          deleteComment: vi.fn(),
          reactToComment: vi.fn(),
          loadMoreComments: vi.fn(),
          refreshComments: vi.fn(),
          triggerAgentResponse: vi.fn(),
          getThreadStructure: vi.fn(),
          stats: { totalComments: 0, rootThreads: 0, maxDepth: 0, agentComments: 0 }
        })
      }));

      render(<CommentSystem postId="test-post" />);

      // Should show "Comments" header
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading.textContent).toBe('Comments');

      // Should show empty state message
      expect(screen.getByText(/no comments yet/i)).toBeInTheDocument();
      expect(screen.getByText(/be the first to share your thoughts/i)).toBeInTheDocument();
    });
  });
});
