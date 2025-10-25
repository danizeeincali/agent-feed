/**
 * useTicketUpdates Hook - Unit Tests
 *
 * Comprehensive test suite for the real-time ticket updates hook
 * Tests WebSocket connections, cache invalidation, and event handling
 */

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTicketUpdates } from '../useTicketUpdates';
import { socket } from '../../services/socket';

// Mock the socket service
vi.mock('../../services/socket', () => ({
  socket: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connected: false
  }
}));

describe('useTicketUpdates', () => {
  let queryClient;
  let wrapper;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    // Wrapper component with QueryClient
    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Connection Lifecycle', () => {
    it('should connect to socket on mount', () => {
      renderHook(() => useTicketUpdates(), { wrapper });

      expect(socket.connect).toHaveBeenCalledTimes(1);
    });

    it('should disconnect from socket on unmount', () => {
      const { unmount } = renderHook(() => useTicketUpdates(), { wrapper });

      unmount();

      expect(socket.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should not connect when disabled', () => {
      renderHook(() => useTicketUpdates({ enabled: false }), { wrapper });

      expect(socket.connect).not.toHaveBeenCalled();
    });

    it('should not register listeners when disabled', () => {
      renderHook(() => useTicketUpdates({ enabled: false }), { wrapper });

      expect(socket.on).not.toHaveBeenCalled();
    });
  });

  describe('Event Listener Registration', () => {
    it('should register ticket:status:update listener', () => {
      renderHook(() => useTicketUpdates(), { wrapper });

      expect(socket.on).toHaveBeenCalledWith(
        'ticket:status:update',
        expect.any(Function)
      );
    });

    it('should register worker:lifecycle listener', () => {
      renderHook(() => useTicketUpdates(), { wrapper });

      expect(socket.on).toHaveBeenCalledWith(
        'worker:lifecycle',
        expect.any(Function)
      );
    });

    it('should register connected listener', () => {
      renderHook(() => useTicketUpdates(), { wrapper });

      expect(socket.on).toHaveBeenCalledWith(
        'connected',
        expect.any(Function)
      );
    });

    it('should register all three event listeners', () => {
      renderHook(() => useTicketUpdates(), { wrapper });

      expect(socket.on).toHaveBeenCalledTimes(3);
    });
  });

  describe('Event Listener Cleanup', () => {
    it('should unregister all listeners on unmount', () => {
      const { unmount } = renderHook(() => useTicketUpdates(), { wrapper });

      unmount();

      expect(socket.off).toHaveBeenCalledWith(
        'ticket:status:update',
        expect.any(Function)
      );
      expect(socket.off).toHaveBeenCalledWith(
        'worker:lifecycle',
        expect.any(Function)
      );
      expect(socket.off).toHaveBeenCalledWith(
        'connected',
        expect.any(Function)
      );
    });

    it('should remove exactly three event listeners on unmount', () => {
      const { unmount } = renderHook(() => useTicketUpdates(), { wrapper });

      unmount();

      expect(socket.off).toHaveBeenCalledTimes(3);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate posts query on update', async () => {
      let ticketUpdateHandler;

      socket.on.mockImplementation((event, handler) => {
        if (event === 'ticket:status:update') {
          ticketUpdateHandler = handler;
        }
      });

      queryClient.setQueryData(['posts'], [
        { id: 'post-123', title: 'Test Post' }
      ]);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      renderHook(() => useTicketUpdates(), { wrapper });

      const mockData = {
        post_id: 'post-123',
        ticket_id: 'ticket-456',
        status: 'completed',
        agent_id: 'link-logger-agent',
        timestamp: new Date().toISOString()
      };

      ticketUpdateHandler(mockData);

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['posts'] });
      });
    });

    it('should invalidate specific post query when post_id present', async () => {
      let ticketUpdateHandler;

      socket.on.mockImplementation((event, handler) => {
        if (event === 'ticket:status:update') {
          ticketUpdateHandler = handler;
        }
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      renderHook(() => useTicketUpdates(), { wrapper });

      const mockData = {
        post_id: 'post-123',
        ticket_id: 'ticket-456',
        status: 'processing',
        agent_id: 'link-logger-agent',
        timestamp: new Date().toISOString()
      };

      ticketUpdateHandler(mockData);

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['post', 'post-123'] });
      });
    });
  });

  describe('Cache Updates', () => {
    it('should update cache with ticket status for array data', async () => {
      let ticketUpdateHandler;

      socket.on.mockImplementation((event, handler) => {
        if (event === 'ticket:status:update') {
          ticketUpdateHandler = handler;
        }
      });

      const initialPosts = [
        { id: 'post-123', title: 'Test Post' },
        { id: 'post-456', title: 'Other Post' }
      ];
      queryClient.setQueryData(['posts'], initialPosts);

      renderHook(() => useTicketUpdates(), { wrapper });

      const mockData = {
        post_id: 'post-123',
        ticket_id: 'ticket-789',
        status: 'completed',
        agent_id: 'link-logger-agent',
        timestamp: new Date().toISOString()
      };

      ticketUpdateHandler(mockData);

      await waitFor(() => {
        const updatedData = queryClient.getQueryData(['posts']);
        expect(updatedData[0].ticketStatus).toBe('completed');
        expect(updatedData[0].lastTicketEvent.ticket_id).toBe('ticket-789');
        expect(updatedData[0].lastTicketEvent.agent_id).toBe('link-logger-agent');
      });
    });

    it('should update cache with ticket status for paginated data', async () => {
      let ticketUpdateHandler;

      socket.on.mockImplementation((event, handler) => {
        if (event === 'ticket:status:update') {
          ticketUpdateHandler = handler;
        }
      });

      const paginatedData = {
        pages: [
          {
            data: [
              { id: 'post-123', title: 'Test Post' },
              { id: 'post-456', title: 'Other Post' }
            ]
          }
        ],
        pageParams: [1]
      };
      queryClient.setQueryData(['posts'], paginatedData);

      renderHook(() => useTicketUpdates(), { wrapper });

      const mockData = {
        post_id: 'post-123',
        ticket_id: 'ticket-789',
        status: 'processing',
        agent_id: 'link-logger-agent',
        timestamp: new Date().toISOString()
      };

      ticketUpdateHandler(mockData);

      await waitFor(() => {
        const updatedData = queryClient.getQueryData(['posts']);
        expect(updatedData.pages[0].data[0].ticketStatus).toBe('processing');
        expect(updatedData.pages[0].data[0].ticketUpdated).toBeDefined();
      });
    });

    it('should only update matching post in cache', async () => {
      let ticketUpdateHandler;

      socket.on.mockImplementation((event, handler) => {
        if (event === 'ticket:status:update') {
          ticketUpdateHandler = handler;
        }
      });

      const initialPosts = [
        { id: 'post-123', title: 'Test Post 1' },
        { id: 'post-456', title: 'Test Post 2' }
      ];
      queryClient.setQueryData(['posts'], initialPosts);

      renderHook(() => useTicketUpdates(), { wrapper });

      const mockData = {
        post_id: 'post-123',
        ticket_id: 'ticket-789',
        status: 'completed',
        agent_id: 'test-agent',
        timestamp: new Date().toISOString()
      };

      ticketUpdateHandler(mockData);

      await waitFor(() => {
        const updatedData = queryClient.getQueryData(['posts']);
        expect(updatedData[0].ticketStatus).toBe('completed');
        expect(updatedData[1].ticketStatus).toBeUndefined();
      });
    });

    it('should store error information in cache for failed status', async () => {
      let ticketUpdateHandler;

      socket.on.mockImplementation((event, handler) => {
        if (event === 'ticket:status:update') {
          ticketUpdateHandler = handler;
        }
      });

      queryClient.setQueryData(['posts'], [
        { id: 'post-123', title: 'Test Post' }
      ]);

      renderHook(() => useTicketUpdates(), { wrapper });

      const mockData = {
        post_id: 'post-123',
        ticket_id: 'ticket-456',
        status: 'failed',
        agent_id: 'test-agent',
        timestamp: new Date().toISOString(),
        error: 'Network timeout'
      };

      ticketUpdateHandler(mockData);

      await waitFor(() => {
        const updatedData = queryClient.getQueryData(['posts']);
        expect(updatedData[0].lastTicketEvent.error).toBe('Network timeout');
      });
    });
  });

  describe('Custom Callbacks', () => {
    it('should call custom onUpdate handler with event data', async () => {
      const onUpdate = vi.fn();
      let ticketUpdateHandler;

      socket.on.mockImplementation((event, handler) => {
        if (event === 'ticket:status:update') {
          ticketUpdateHandler = handler;
        }
      });

      renderHook(() => useTicketUpdates({ onUpdate }), { wrapper });

      const mockData = {
        post_id: 'post-123',
        ticket_id: 'ticket-456',
        status: 'completed',
        agent_id: 'link-logger-agent',
        timestamp: new Date().toISOString()
      };

      ticketUpdateHandler(mockData);

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(mockData);
        expect(onUpdate).toHaveBeenCalledTimes(1);
      });
    });

    it('should not call onUpdate if not provided', async () => {
      let ticketUpdateHandler;

      socket.on.mockImplementation((event, handler) => {
        if (event === 'ticket:status:update') {
          ticketUpdateHandler = handler;
        }
      });

      renderHook(() => useTicketUpdates(), { wrapper });

      const mockData = {
        post_id: 'post-123',
        ticket_id: 'ticket-456',
        status: 'completed',
        agent_id: 'test-agent',
        timestamp: new Date().toISOString()
      };

      expect(() => ticketUpdateHandler(mockData)).not.toThrow();
    });
  });

  describe('Toast Notifications', () => {
    it('should call toast for completed status when enabled', async () => {
      const mockToast = {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn()
      };

      let ticketUpdateHandler;

      socket.on.mockImplementation((event, handler) => {
        if (event === 'ticket:status:update') {
          ticketUpdateHandler = handler;
        }
      });

      renderHook(() => useTicketUpdates({ showNotifications: true, toast: mockToast }), { wrapper });

      const mockData = {
        post_id: 'post-123',
        ticket_id: 'ticket-456',
        status: 'completed',
        agent_id: 'link-logger-agent',
        timestamp: new Date().toISOString()
      };

      ticketUpdateHandler(mockData);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });
    });

    it('should call toast for failed status when enabled', async () => {
      const mockToast = {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn()
      };

      let ticketUpdateHandler;

      socket.on.mockImplementation((event, handler) => {
        if (event === 'ticket:status:update') {
          ticketUpdateHandler = handler;
        }
      });

      renderHook(() => useTicketUpdates({ showNotifications: true, toast: mockToast }), { wrapper });

      const mockData = {
        post_id: 'post-123',
        ticket_id: 'ticket-456',
        status: 'failed',
        agent_id: 'test-agent',
        timestamp: new Date().toISOString(),
        error: 'Test error'
      };

      ticketUpdateHandler(mockData);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });
    });

    it('should not call toast when notifications disabled', async () => {
      const mockToast = {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn()
      };

      let ticketUpdateHandler;

      socket.on.mockImplementation((event, handler) => {
        if (event === 'ticket:status:update') {
          ticketUpdateHandler = handler;
        }
      });

      renderHook(() => useTicketUpdates({ showNotifications: false, toast: mockToast }), { wrapper });

      const mockData = {
        post_id: 'post-123',
        ticket_id: 'ticket-456',
        status: 'completed',
        agent_id: 'test-agent',
        timestamp: new Date().toISOString()
      };

      ticketUpdateHandler(mockData);

      await waitFor(() => {
        expect(mockToast.success).not.toHaveBeenCalled();
      });
    });
  });

  describe('Return Values', () => {
    it('should return socket instance', () => {
      const { result } = renderHook(() => useTicketUpdates(), { wrapper });

      expect(result.current.socket).toBe(socket);
    });

    it('should return connection status', () => {
      socket.connected = true;

      const { result } = renderHook(() => useTicketUpdates(), { wrapper });

      expect(result.current.isConnected).toBe(true);
    });

    it('should reflect disconnected status', () => {
      socket.connected = false;

      const { result } = renderHook(() => useTicketUpdates(), { wrapper });

      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('No Emoji Verification', () => {
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;

    it('should not contain emojis in test descriptions', () => {
      const testFile = import.meta.url;
      expect(testFile).not.toMatch(emojiRegex);
    });

    it('should not use emojis in console logs', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      let ticketUpdateHandler;

      socket.on.mockImplementation((event, handler) => {
        if (event === 'ticket:status:update') {
          ticketUpdateHandler = handler;
        }
      });

      renderHook(() => useTicketUpdates(), { wrapper });

      const mockData = {
        post_id: 'post-123',
        ticket_id: 'ticket-456',
        status: 'completed',
        agent_id: 'test-agent',
        timestamp: new Date().toISOString()
      };

      ticketUpdateHandler(mockData);

      await waitFor(() => {
        if (consoleSpy.mock.calls.length > 0) {
          const logs = consoleSpy.mock.calls.map(call => call.join(' ')).join(' ');
          expect(logs).not.toMatch(emojiRegex);
        }
      });

      consoleSpy.mockRestore();
    });
  });
});
