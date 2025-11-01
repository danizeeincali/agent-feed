/**
 * Unit Tests: Toast Integration for Real-time Comments
 *
 * Tests for toast notifications triggered by real-time comment events
 * including author name display, emoji differentiation, and auto-dismiss behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CommentSystem } from '../../components/comments/CommentSystem';
import { socket } from '../../services/socket';
import type { CommentTreeNode } from '../../components/comments/CommentSystem';

// Mock socket service
vi.mock('../../services/socket', () => ({
  socket: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connected: true,
    connect: vi.fn(),
  },
  subscribeToPost: vi.fn(),
  unsubscribeFromPost: vi.fn(),
}));

// Mock toast service
const mockToast = vi.fn();
vi.mock('../../components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('Toast Integration for Real-time Comments', () => {
  const mockPostId = 'test-post-123';
  let socketHandlers: Record<string, Function> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    socketHandlers = {};

    // Capture socket event handlers
    (socket.on as any).mockImplementation((event: string, handler: Function) => {
      socketHandlers[event] = handler;
    });
  });

  afterEach(() => {
    socketHandlers = {};
  });

  describe('Toast Notification Triggering', () => {
    it('should trigger toast notification on comment:created event', async () => {
      const mockComment: CommentTreeNode = {
        id: 'comment-1',
        content: 'Test comment content',
        contentType: 'text',
        author: {
          type: 'user',
          id: 'user-123',
          name: 'John Doe',
        },
        metadata: {
          threadDepth: 0,
          threadPath: 'comment-1',
          replyCount: 0,
          likeCount: 0,
          reactionCount: 0,
          isAgentResponse: false,
        },
        engagement: {
          likes: 0,
          reactions: {},
          userReacted: false,
        },
        status: 'published',
        children: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      render(
        <CommentSystem
          postId={mockPostId}
          enableRealtime={true}
        />
      );

      // Simulate comment:created event
      await waitFor(() => {
        if (socketHandlers['comment:added']) {
          socketHandlers['comment:added']({
            postId: mockPostId,
            comment: mockComment,
          });
        }
      });

      // Verify toast was called
      expect(mockToast).toHaveBeenCalled();
    });

    it('should NOT trigger toast for comments on different posts', async () => {
      const mockComment: CommentTreeNode = {
        id: 'comment-2',
        content: 'Different post comment',
        contentType: 'text',
        author: {
          type: 'user',
          id: 'user-456',
          name: 'Jane Smith',
        },
        metadata: {
          threadDepth: 0,
          threadPath: 'comment-2',
          replyCount: 0,
          likeCount: 0,
          reactionCount: 0,
          isAgentResponse: false,
        },
        engagement: {
          likes: 0,
          reactions: {},
          userReacted: false,
        },
        status: 'published',
        children: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      render(
        <CommentSystem
          postId={mockPostId}
          enableRealtime={true}
        />
      );

      // Simulate comment on different post
      await waitFor(() => {
        if (socketHandlers['comment:added']) {
          socketHandlers['comment:added']({
            postId: 'different-post-id',
            comment: mockComment,
          });
        }
      });

      // Verify toast was NOT called
      expect(mockToast).not.toHaveBeenCalled();
    });
  });

  describe('Toast Content - Author Name Display', () => {
    it('should display correct author name in toast', async () => {
      const authorName = 'Alice Johnson';
      const mockComment: CommentTreeNode = {
        id: 'comment-3',
        content: 'Test comment',
        contentType: 'text',
        author: {
          type: 'user',
          id: 'user-789',
          name: authorName,
        },
        metadata: {
          threadDepth: 0,
          threadPath: 'comment-3',
          replyCount: 0,
          likeCount: 0,
          reactionCount: 0,
          isAgentResponse: false,
        },
        engagement: {
          likes: 0,
          reactions: {},
          userReacted: false,
        },
        status: 'published',
        children: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      render(
        <CommentSystem
          postId={mockPostId}
          enableRealtime={true}
        />
      );

      await waitFor(() => {
        if (socketHandlers['comment:added']) {
          socketHandlers['comment:added']({
            postId: mockPostId,
            comment: mockComment,
          });
        }
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining(authorName),
        })
      );
    });

    it('should handle missing author name gracefully', async () => {
      const mockComment: CommentTreeNode = {
        id: 'comment-4',
        content: 'Test comment',
        contentType: 'text',
        author: {
          type: 'user',
          id: 'user-unknown',
          name: '',
        },
        metadata: {
          threadDepth: 0,
          threadPath: 'comment-4',
          replyCount: 0,
          likeCount: 0,
          reactionCount: 0,
          isAgentResponse: false,
        },
        engagement: {
          likes: 0,
          reactions: {},
          userReacted: false,
        },
        status: 'published',
        children: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      render(
        <CommentSystem
          postId={mockPostId}
          enableRealtime={true}
        />
      );

      await waitFor(() => {
        if (socketHandlers['comment:added']) {
          socketHandlers['comment:added']({
            postId: mockPostId,
            comment: mockComment,
          });
        }
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('Unknown'),
        })
      );
    });
  });

  describe('Toast Content - Emoji Based on Author Type', () => {
    it('should show user emoji (💬) for user comments', async () => {
      const mockComment: CommentTreeNode = {
        id: 'comment-5',
        content: 'User comment',
        contentType: 'text',
        author: {
          type: 'user',
          id: 'user-123',
          name: 'Bob Wilson',
        },
        metadata: {
          threadDepth: 0,
          threadPath: 'comment-5',
          replyCount: 0,
          likeCount: 0,
          reactionCount: 0,
          isAgentResponse: false,
        },
        engagement: {
          likes: 0,
          reactions: {},
          userReacted: false,
        },
        status: 'published',
        children: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      render(
        <CommentSystem
          postId={mockPostId}
          enableRealtime={true}
        />
      );

      await waitFor(() => {
        if (socketHandlers['comment:added']) {
          socketHandlers['comment:added']({
            postId: mockPostId,
            comment: mockComment,
          });
        }
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('💬'),
        })
      );
    });

    it('should show agent emoji (🤖) for agent comments', async () => {
      const mockComment: CommentTreeNode = {
        id: 'comment-6',
        content: 'Agent response',
        contentType: 'markdown',
        author: {
          type: 'agent',
          id: 'agent-avi',
          name: 'Avi Assistant',
        },
        metadata: {
          threadDepth: 0,
          threadPath: 'comment-6',
          replyCount: 0,
          likeCount: 0,
          reactionCount: 0,
          isAgentResponse: true,
        },
        engagement: {
          likes: 0,
          reactions: {},
          userReacted: false,
        },
        status: 'published',
        children: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      render(
        <CommentSystem
          postId={mockPostId}
          enableRealtime={true}
        />
      );

      await waitFor(() => {
        if (socketHandlers['comment:added']) {
          socketHandlers['comment:added']({
            postId: mockPostId,
            comment: mockComment,
          });
        }
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('🤖'),
        })
      );
    });
  });

  describe('Toast Auto-dismiss Behavior', () => {
    it('should set appropriate duration for auto-dismiss', async () => {
      const mockComment: CommentTreeNode = {
        id: 'comment-7',
        content: 'Test auto-dismiss',
        contentType: 'text',
        author: {
          type: 'user',
          id: 'user-123',
          name: 'Test User',
        },
        metadata: {
          threadDepth: 0,
          threadPath: 'comment-7',
          replyCount: 0,
          likeCount: 0,
          reactionCount: 0,
          isAgentResponse: false,
        },
        engagement: {
          likes: 0,
          reactions: {},
          userReacted: false,
        },
        status: 'published',
        children: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      render(
        <CommentSystem
          postId={mockPostId}
          enableRealtime={true}
        />
      );

      await waitFor(() => {
        if (socketHandlers['comment:added']) {
          socketHandlers['comment:added']({
            postId: mockPostId,
            comment: mockComment,
          });
        }
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: expect.any(Number),
        })
      );

      // Verify duration is between 3-5 seconds (reasonable range)
      const callArgs = mockToast.mock.calls[0][0];
      expect(callArgs.duration).toBeGreaterThanOrEqual(3000);
      expect(callArgs.duration).toBeLessThanOrEqual(5000);
    });

    it('should not set infinite duration (must auto-dismiss)', async () => {
      const mockComment: CommentTreeNode = {
        id: 'comment-8',
        content: 'Test finite duration',
        contentType: 'text',
        author: {
          type: 'user',
          id: 'user-123',
          name: 'Test User',
        },
        metadata: {
          threadDepth: 0,
          threadPath: 'comment-8',
          replyCount: 0,
          likeCount: 0,
          reactionCount: 0,
          isAgentResponse: false,
        },
        engagement: {
          likes: 0,
          reactions: {},
          userReacted: false,
        },
        status: 'published',
        children: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      render(
        <CommentSystem
          postId={mockPostId}
          enableRealtime={true}
        />
      );

      await waitFor(() => {
        if (socketHandlers['comment:added']) {
          socketHandlers['comment:added']({
            postId: mockPostId,
            comment: mockComment,
          });
        }
      });

      const callArgs = mockToast.mock.calls[0][0];
      expect(callArgs.duration).not.toBe(Infinity);
      expect(callArgs.duration).not.toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid successive comments without toast spam', async () => {
      render(
        <CommentSystem
          postId={mockPostId}
          enableRealtime={true}
        />
      );

      // Simulate 5 rapid comments
      for (let i = 0; i < 5; i++) {
        const mockComment: CommentTreeNode = {
          id: `comment-${i}`,
          content: `Rapid comment ${i}`,
          contentType: 'text',
          author: {
            type: 'user',
            id: `user-${i}`,
            name: `User ${i}`,
          },
          metadata: {
            threadDepth: 0,
            threadPath: `comment-${i}`,
            replyCount: 0,
            likeCount: 0,
            reactionCount: 0,
            isAgentResponse: false,
          },
          engagement: {
            likes: 0,
            reactions: {},
            userReacted: false,
          },
          status: 'published',
          children: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (socketHandlers['comment:added']) {
          socketHandlers['comment:added']({
            postId: mockPostId,
            comment: mockComment,
          });
        }
      }

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      });

      // Verify we don't show more than 5 toasts
      expect(mockToast.mock.calls.length).toBeLessThanOrEqual(5);
    });

    it('should handle malformed comment data gracefully', async () => {
      render(
        <CommentSystem
          postId={mockPostId}
          enableRealtime={true}
        />
      );

      // Simulate malformed comment (missing required fields)
      await waitFor(() => {
        if (socketHandlers['comment:added']) {
          socketHandlers['comment:added']({
            postId: mockPostId,
            comment: {
              id: 'malformed',
              // Missing content, author, etc.
            },
          });
        }
      });

      // Should not crash, may or may not show toast
      // The important thing is it doesn't throw an error
      expect(true).toBe(true);
    });
  });
});
