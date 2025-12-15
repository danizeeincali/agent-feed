import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RealSocialMediaFeed from '../RealSocialMediaFeed';

/**
 * TDD Test Suite for Issue 2: Real-Time Comment Updates
 *
 * PROBLEM: Comment counter doesn't update in real-time
 * EXPECTED: WebSocket events trigger comment counter updates and reloads
 *
 * Test Coverage:
 * - Comment counter updates on WebSocket event
 * - Visible comments reload when event fires
 * - Collapsed comments don't reload (performance)
 * - Multiple posts handle events independently
 * - No duplicate reloads
 * - Event listener cleanup on unmount
 */

// Mock WebSocket
const mockSocketOn = vi.fn();
const mockSocketOff = vi.fn();
const mockSocketEmit = vi.fn();

vi.mock('../hooks/useSocket', () => ({
  default: () => ({
    on: mockSocketOn,
    off: mockSocketOff,
    emit: mockSocketEmit,
  }),
}));

// Mock API
global.fetch = vi.fn();

describe('Issue 2: Real-Time Comment Updates', () => {
  let socketEventHandlers: Record<string, Function> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    socketEventHandlers = {};

    // Capture WebSocket event handlers
    mockSocketOn.mockImplementation((event: string, handler: Function) => {
      socketEventHandlers[event] = handler;
    });

    // Mock fetch for initial load
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        posts: [
          {
            id: 1,
            content: 'Test post',
            author: 'User',
            created_at: new Date().toISOString(),
            comment_count: 2,
          },
          {
            id: 2,
            content: 'Second post',
            author: 'User',
            created_at: new Date().toISOString(),
            comment_count: 0,
          },
        ],
      }),
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('WebSocket Event Registration', () => {
    it('should register comment:created event listener on mount', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(mockSocketOn).toHaveBeenCalledWith(
          'comment:created',
          expect.any(Function)
        );
      });
    });

    it('should unregister event listener on unmount', async () => {
      const { unmount } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(mockSocketOn).toHaveBeenCalled();
      });

      unmount();

      expect(mockSocketOff).toHaveBeenCalledWith(
        'comment:created',
        expect.any(Function)
      );
    });
  });

  describe('Comment Counter Real-Time Updates', () => {
    it('should increment comment counter when comment:created event fires', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('2 comments')).toBeInTheDocument();
      });

      // Simulate WebSocket event
      const commentCreatedHandler = socketEventHandlers['comment:created'];
      expect(commentCreatedHandler).toBeDefined();

      commentCreatedHandler({
        postId: 1,
        comment: {
          id: 3,
          post_id: 1,
          content: 'New comment',
          created_at: new Date().toISOString(),
        },
      });

      await waitFor(() => {
        expect(screen.getByText('3 comments')).toBeInTheDocument();
      });
    });

    it('should update from 0 to 1 comment', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('0 comments')).toBeInTheDocument();
      });

      const commentCreatedHandler = socketEventHandlers['comment:created'];
      commentCreatedHandler({
        postId: 2,
        comment: {
          id: 1,
          post_id: 2,
          content: 'First comment',
          created_at: new Date().toISOString(),
        },
      });

      await waitFor(() => {
        expect(screen.getByText('1 comment')).toBeInTheDocument();
      });
    });

    it('should handle multiple rapid events correctly', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('2 comments')).toBeInTheDocument();
      });

      const commentCreatedHandler = socketEventHandlers['comment:created'];

      // Rapid fire 3 events
      commentCreatedHandler({
        postId: 1,
        comment: { id: 3, post_id: 1, content: 'Comment 3' },
      });
      commentCreatedHandler({
        postId: 1,
        comment: { id: 4, post_id: 1, content: 'Comment 4' },
      });
      commentCreatedHandler({
        postId: 1,
        comment: { id: 5, post_id: 1, content: 'Comment 5' },
      });

      await waitFor(() => {
        expect(screen.getByText('5 comments')).toBeInTheDocument();
      });
    });
  });

  describe('Visible Comments Real-Time Reload', () => {
    it('should reload visible comments when event fires', async () => {
      const user = userEvent.setup();

      // Mock comments endpoint
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/comments')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              comments: [
                {
                  id: 1,
                  post_id: 1,
                  content: 'Existing comment',
                  created_at: new Date().toISOString(),
                },
              ],
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ posts: [] }),
        });
      });

      render(<RealSocialMediaFeed />);

      // Expand comments
      const viewCommentsButton = await screen.findByText(/View 2 comments/i);
      await user.click(viewCommentsButton);

      await waitFor(() => {
        expect(screen.getByText('Existing comment')).toBeInTheDocument();
      });

      // Mock updated comments
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/comments')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              comments: [
                {
                  id: 1,
                  post_id: 1,
                  content: 'Existing comment',
                  created_at: new Date().toISOString(),
                },
                {
                  id: 2,
                  post_id: 1,
                  content: 'New real-time comment',
                  created_at: new Date().toISOString(),
                },
              ],
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ posts: [] }),
        });
      });

      // Trigger WebSocket event
      const commentCreatedHandler = socketEventHandlers['comment:created'];
      commentCreatedHandler({
        postId: 1,
        comment: {
          id: 2,
          post_id: 1,
          content: 'New real-time comment',
          created_at: new Date().toISOString(),
        },
      });

      await waitFor(() => {
        expect(screen.getByText('New real-time comment')).toBeInTheDocument();
      });
    });

    it('should NOT reload collapsed comments (performance optimization)', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('2 comments')).toBeInTheDocument();
      });

      const initialFetchCount = (global.fetch as any).mock.calls.length;

      // Trigger event for collapsed post
      const commentCreatedHandler = socketEventHandlers['comment:created'];
      commentCreatedHandler({
        postId: 1,
        comment: {
          id: 3,
          post_id: 1,
          content: 'New comment',
          created_at: new Date().toISOString(),
        },
      });

      await waitFor(() => {
        expect(screen.getByText('3 comments')).toBeInTheDocument();
      });

      // Should not make additional fetch for comments
      const finalFetchCount = (global.fetch as any).mock.calls.length;
      expect(finalFetchCount).toBe(initialFetchCount);
    });
  });

  describe('Multiple Posts Independence', () => {
    it('should only update the specific post that received a comment', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('2 comments')).toBeInTheDocument();
        expect(screen.getByText('0 comments')).toBeInTheDocument();
      });

      const commentCreatedHandler = socketEventHandlers['comment:created'];
      commentCreatedHandler({
        postId: 2,
        comment: {
          id: 1,
          post_id: 2,
          content: 'Comment on post 2',
          created_at: new Date().toISOString(),
        },
      });

      await waitFor(() => {
        // Post 2 should update
        expect(screen.getByText('1 comment')).toBeInTheDocument();
        // Post 1 should remain unchanged
        expect(screen.getByText('2 comments')).toBeInTheDocument();
      });
    });

    it('should handle events for non-existent posts gracefully', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('2 comments')).toBeInTheDocument();
      });

      const commentCreatedHandler = socketEventHandlers['comment:created'];

      // Should not crash
      expect(() => {
        commentCreatedHandler({
          postId: 999,
          comment: {
            id: 1,
            post_id: 999,
            content: 'Comment on non-existent post',
            created_at: new Date().toISOString(),
          },
        });
      }).not.toThrow();
    });
  });

  describe('Duplicate Prevention', () => {
    it('should not duplicate reload requests', async () => {
      const user = userEvent.setup();
      let commentsCallCount = 0;

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/comments')) {
          commentsCallCount++;
          return Promise.resolve({
            ok: true,
            json: async () => ({
              comments: [
                {
                  id: 1,
                  post_id: 1,
                  content: 'Comment',
                  created_at: new Date().toISOString(),
                },
              ],
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ posts: [] }),
        });
      });

      render(<RealSocialMediaFeed />);

      const viewCommentsButton = await screen.findByText(/View 2 comments/i);
      await user.click(viewCommentsButton);

      await waitFor(() => {
        expect(screen.getByText('Comment')).toBeInTheDocument();
      });

      commentsCallCount = 0;

      // Fire same event twice rapidly
      const commentCreatedHandler = socketEventHandlers['comment:created'];
      commentCreatedHandler({
        postId: 1,
        comment: { id: 2, post_id: 1, content: 'New' },
      });
      commentCreatedHandler({
        postId: 1,
        comment: { id: 2, post_id: 1, content: 'New' },
      });

      await waitFor(() => {
        // Should only reload once despite duplicate events
        expect(commentsCallCount).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed WebSocket events gracefully', async () => {
      render(<RealSocialMediaFeed />);

      const commentCreatedHandler = socketEventHandlers['comment:created'];

      // Should not crash on malformed data
      expect(() => {
        commentCreatedHandler(null);
        commentCreatedHandler(undefined);
        commentCreatedHandler({});
        commentCreatedHandler({ postId: null });
        commentCreatedHandler({ comment: null });
      }).not.toThrow();
    });

    it('should handle failed comment reload gracefully', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/comments')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ posts: [] }),
        });
      });

      render(<RealSocialMediaFeed />);

      const viewCommentsButton = await screen.findByText(/View 2 comments/i);
      await user.click(viewCommentsButton);

      const commentCreatedHandler = socketEventHandlers['comment:created'];

      // Should not crash on reload failure
      expect(() => {
        commentCreatedHandler({
          postId: 1,
          comment: { id: 2, post_id: 1, content: 'New' },
        });
      }).not.toThrow();
    });
  });
});
