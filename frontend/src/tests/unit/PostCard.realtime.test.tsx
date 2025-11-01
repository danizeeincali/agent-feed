/**
 * TDD Unit Tests for PostCard Real-time Comment Functionality
 * Tests Socket.IO integration, real-time updates, and stale closure fixes
 *
 * Test Strategy:
 * - Mock Socket.IO client service
 * - Test connection lifecycle (mount, unmount)
 * - Test event handling (comment:created, comment:updated, comment:deleted)
 * - Test counter updates
 * - Test stale closure prevention
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PostCard } from '../../components/PostCard';

// Mock the socket service - inline to avoid hoisting issues
vi.mock('../../services/socket', () => ({
  socket: {
    connected: false,
    id: 'mock-socket-id',
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    emit: vi.fn().mockReturnThis(),
  },
  subscribeToPost: vi.fn(),
  unsubscribeFromPost: vi.fn(),
}));

// Mock useToast hook
vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
    hideToast: vi.fn(),
  }),
}));

// Mock content parser
vi.mock('../../utils/contentParser', () => ({
  parseContent: (content: string) => ({ type: 'text', content }),
  renderParsedContent: (parsed: any) => <div>{parsed.content}</div>,
}));

// Mock cn utility
vi.mock('../../utils/cn', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

describe('PostCard Real-time Comments', () => {
  const mockPost = {
    id: 'post-123',
    title: 'Test Post Title',
    content: 'Test post content',
    authorAgent: 'test-agent',
    publishedAt: new Date().toISOString(),
    comments: 0,
    bookmarks: 0,
    shares: 0,
    views: 0,
  };

  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    // Get fresh mock socket
    mockSocket = createMockSocket();

    // Update the mock module
    vi.mocked(require('../../services/socket')).socket = mockSocket;

    // Mock fetch for comment loading
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      })
    ) as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Socket.IO Connection Lifecycle', () => {
    it('should connect to Socket.IO on mount if not connected', () => {
      mockSocket.connected = false;

      render(<PostCard post={mockPost} />);

      // Should call socket.connect()
      expect(mockSocket.connect).toHaveBeenCalled();
    });

    it('should subscribe to post room on mount', () => {
      render(<PostCard post={mockPost} />);

      // Should emit subscribe:post event
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe:post', 'post-123');
    });

    it('should register Socket.IO event listeners', () => {
      render(<PostCard post={mockPost} />);

      // Should register event listeners
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('comment:created', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('comment:updated', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('comment:deleted', expect.any(Function));
    });

    it('should unsubscribe and cleanup on unmount', () => {
      const { unmount } = render(<PostCard post={mockPost} />);

      unmount();

      // Should remove event listeners
      expect(mockSocket.off).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('comment:created', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('comment:updated', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('comment:deleted', expect.any(Function));

      // Should emit unsubscribe event
      const unsubscribeCalls = vi.mocked(mockSocket.emit).mock.calls
        .filter(call => call[0] === 'unsubscribe:post');
      expect(unsubscribeCalls.length).toBeGreaterThan(0);
      expect(unsubscribeCalls[0]).toEqual(['unsubscribe:post', 'post-123']);
    });
  });

  describe('Real-time Comment Events', () => {
    it('should increment counter when comment:created event received', async () => {
      // Store event handlers
      const handlers = new Map<string, Function>();
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        handlers.set(event, handler);
        return mockSocket;
      });

      render(<PostCard post={mockPost} />);

      // Get the comment:created handler
      const commentCreatedHandler = handlers.get('comment:created');
      expect(commentCreatedHandler).toBeDefined();

      // Simulate event
      await act(async () => {
        commentCreatedHandler!({
          postId: 'post-123',
          comment: { id: 'comment-1', content: 'Test comment' },
        });
      });

      // Counter should increment
      await waitFor(() => {
        expect(screen.getByText(/1 Comments?/)).toBeInTheDocument();
      });
    });

    it('should ignore events for other posts', async () => {
      const handlers = new Map<string, Function>();
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        handlers.set(event, handler);
        return mockSocket;
      });

      render(<PostCard post={mockPost} />);

      const commentCreatedHandler = handlers.get('comment:created');

      // Clear initial fetch calls
      vi.mocked(global.fetch).mockClear();

      // Simulate event for different post
      await act(async () => {
        commentCreatedHandler!({
          postId: 'other-post-id',
          comment: { id: 'comment-1', content: 'Test' },
        });
      });

      // Counter should remain 0
      expect(screen.getByText(/Comment$/)).toBeInTheDocument();
    });

    it('should decrement counter on comment:deleted event', async () => {
      const postWithComments = { ...mockPost, comments: 2 };

      const handlers = new Map<string, Function>();
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        handlers.set(event, handler);
        return mockSocket;
      });

      render(<PostCard post={postWithComments} />);

      const commentDeletedHandler = handlers.get('comment:deleted');
      expect(commentDeletedHandler).toBeDefined();

      // Simulate delete event
      await act(async () => {
        commentDeletedHandler!({
          postId: 'post-123',
          commentId: 'comment-1',
        });
      });

      // Counter should decrement
      await waitFor(() => {
        expect(screen.getByText(/1 Comments?/)).toBeInTheDocument();
      });
    });

    it('should reload comments when comment:updated event received', async () => {
      const handlers = new Map<string, Function>();
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        handlers.set(event, handler);
        return mockSocket;
      });

      render(<PostCard post={mockPost} />);

      const commentUpdatedHandler = handlers.get('comment:updated');

      // Clear initial calls
      vi.mocked(global.fetch).mockClear();

      // Mock fetch for reload
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [{ id: 'c1', content: 'Updated' }] }),
        })
      ) as any;

      // Simulate update event
      await act(async () => {
        commentUpdatedHandler!({
          postId: 'post-123',
          comment: { id: 'comment-1', content: 'Updated content' },
        });
      });

      // Should trigger fetch
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/agent-posts/post-123/comments');
      });
    });
  });

  describe('Comment Counter Display', () => {
    it('should display "Comment" when count is 0', () => {
      render(<PostCard post={mockPost} />);
      expect(screen.getByText(/Comment$/)).toBeInTheDocument();
    });

    it('should display count when > 0', () => {
      const postWithComments = { ...mockPost, comments: 3 };
      render(<PostCard post={postWithComments} />);
      expect(screen.getByText(/3 Comments/)).toBeInTheDocument();
    });

    it('should update counter after loading comments from API', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [
              { id: '1', content: 'C1' },
              { id: '2', content: 'C2' },
            ]
          }),
        })
      ) as any;

      const user = userEvent.setup();
      render(<PostCard post={mockPost} />);

      // Click to show comments
      const commentButton = screen.getByText(/Comment$/);
      await user.click(commentButton);

      // Counter should update to show loaded count
      await waitFor(() => {
        expect(screen.getByText(/2 Comments/)).toBeInTheDocument();
      });
    });
  });

  describe('Stale Closure Prevention', () => {
    it('should reload comments multiple times without stale closure bug', async () => {
      const handlers = new Map<string, Function>();
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        handlers.set(event, handler);
        return mockSocket;
      });

      const fetchCalls: any[] = [];
      global.fetch = vi.fn(() => {
        fetchCalls.push(Date.now());
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }) as any;

      render(<PostCard post={mockPost} />);

      const commentUpdatedHandler = handlers.get('comment:updated');

      // First event
      await act(async () => {
        commentUpdatedHandler!({ postId: 'post-123', comment: { id: 'c1' } });
      });

      await waitFor(() => expect(fetchCalls.length).toBe(1));

      // Second event - should ALSO trigger fetch (no stale closure)
      await act(async () => {
        commentUpdatedHandler!({ postId: 'post-123', comment: { id: 'c2' } });
      });

      await waitFor(() => expect(fetchCalls.length).toBe(2));

      // Third event - verify pattern continues
      await act(async () => {
        commentUpdatedHandler!({ postId: 'post-123', comment: { id: 'c3' } });
      });

      await waitFor(() => expect(fetchCalls.length).toBe(3));

      // All events should have triggered independent fetches
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle rapid events without closure issues', async () => {
      const handlers = new Map<string, Function>();
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        handlers.set(event, handler);
        return mockSocket;
      });

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        })
      ) as any;

      render(<PostCard post={mockPost} />);

      const commentUpdatedHandler = handlers.get('comment:updated');

      // Fire 5 rapid events
      await act(async () => {
        for (let i = 0; i < 5; i++) {
          commentUpdatedHandler!({ postId: 'post-123', comment: { id: `c${i}` } });
        }
      });

      // All should trigger fetches
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(5);
      });
    });
  });

  describe('Comment Loading', () => {
    it('should show loading state when fetching', async () => {
      global.fetch = vi.fn(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ data: [] }),
          } as any), 200)
        )
      ) as any;

      const user = userEvent.setup();
      render(<PostCard post={mockPost} />);

      const commentButton = screen.getByText(/Comment$/);
      await user.click(commentButton);

      // Should show loading
      expect(screen.getByText(/Loading comments/)).toBeInTheDocument();
    });

    it('should handle fetch errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        })
      ) as any;

      const user = userEvent.setup();
      render(<PostCard post={mockPost} />);

      const commentButton = screen.getByText(/Comment$/);
      await user.click(commentButton);

      // Should not crash, should log error
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });
  });

  describe('handleCommentsUpdate Implementation', () => {
    it('should have no circular dependencies', () => {
      // This test verifies that the component renders without infinite loops
      // If handleCommentsUpdate had circular dependencies, rendering would hang
      const { unmount } = render(<PostCard post={mockPost} />);

      expect(screen.getByText('Test Post Title')).toBeInTheDocument();

      unmount();

      // If we got here without hanging, the dependency array is correct
      expect(true).toBe(true);
    });

    it('should reset state before fetching', async () => {
      const handlers = new Map<string, Function>();
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        handlers.set(event, handler);
        return mockSocket;
      });

      let callCount = 0;
      global.fetch = vi.fn(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: Array(callCount).fill(null).map((_, i) => ({ id: `c${i}`, content: `C${i}` }))
          }),
        });
      }) as any;

      const user = userEvent.setup();
      render(<PostCard post={mockPost} />);

      // First load
      await user.click(screen.getByText(/Comment$/));
      await waitFor(() => expect(screen.getByText(/1 Comments/)).toBeInTheDocument());

      // Trigger update - should reset and reload
      const commentUpdatedHandler = handlers.get('comment:updated');
      await act(async () => {
        commentUpdatedHandler!({ postId: 'post-123', comment: { id: 'new' } });
      });

      // Counter should update with fresh data
      await waitFor(() => {
        expect(screen.getByText(/2 Comments/)).toBeInTheDocument();
      });
    });
  });
});
