import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRealtimeComments } from '../../src/hooks/useRealtimeComments';
import { socket } from '../../src/services/socket';

// Mock socket.io-client
vi.mock('../../src/services/socket', () => ({
  socket: {
    connected: false,
    connect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    removeAllListeners: vi.fn()
  },
  subscribeToPost: vi.fn(),
  unsubscribeFromPost: vi.fn()
}));

describe('WebSocket Subscription Fix - Event-Driven Architecture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socket.connected = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Connection-Driven Subscription', () => {
    it('should wait for connection before subscribing', async () => {
      const { result } = renderHook(() =>
        useRealtimeComments('post-123', { enabled: true, onCommentAdded: vi.fn() })
      );

      // Initially not connected - should NOT subscribe yet
      expect(vi.mocked(socket.emit)).not.toHaveBeenCalledWith('subscribe:post', 'post-123');

      // Simulate connection completing
      socket.connected = true;
      const connectHandler = vi.mocked(socket.on).mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];

      if (connectHandler) {
        connectHandler();
      }

      // Now should subscribe
      await waitFor(() => {
        expect(vi.mocked(socket.emit)).toHaveBeenCalledWith('subscribe:post', 'post-123');
      });
    });

    it('should subscribe immediately if already connected', async () => {
      socket.connected = true;

      renderHook(() =>
        useRealtimeComments('post-123', { enabled: true, onCommentAdded: vi.fn() })
      );

      // Should subscribe without waiting for connect event
      await waitFor(() => {
        expect(vi.mocked(socket.emit)).toHaveBeenCalledWith('subscribe:post', 'post-123');
      });
    });

    it('should handle reconnection after disconnect', async () => {
      const { rerender } = renderHook(() =>
        useRealtimeComments('post-123', { enabled: true, onCommentAdded: vi.fn() })
      );

      // Initial connection
      socket.connected = true;
      const connectHandler = vi.mocked(socket.on).mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];

      if (connectHandler) {
        connectHandler();
      }

      await waitFor(() => {
        expect(vi.mocked(socket.emit)).toHaveBeenCalledWith('subscribe:post', 'post-123');
      });

      vi.clearAllMocks();

      // Simulate disconnect
      socket.connected = false;
      const disconnectHandler = vi.mocked(socket.on).mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];

      if (disconnectHandler) {
        disconnectHandler();
      }

      // Simulate reconnect
      socket.connected = true;
      if (connectHandler) {
        connectHandler();
      }

      // Should resubscribe after reconnection
      await waitFor(() => {
        expect(vi.mocked(socket.emit)).toHaveBeenCalledWith('subscribe:post', 'post-123');
      });
    });
  });

  describe('Subscription State Tracking with Refs', () => {
    it('should track subscription state to prevent duplicates', async () => {
      const { rerender } = renderHook(() =>
        useRealtimeComments('post-123', { enabled: true, onCommentAdded: vi.fn() })
      );

      socket.connected = true;
      const connectHandler = vi.mocked(socket.on).mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];

      if (connectHandler) {
        connectHandler();
      }

      await waitFor(() => {
        expect(vi.mocked(socket.emit)).toHaveBeenCalledWith('subscribe:post', 'post-123');
      });

      // Clear mocks and trigger rerender
      vi.clearAllMocks();
      rerender();

      // Should NOT subscribe again on rerender
      expect(vi.mocked(socket.emit)).not.toHaveBeenCalledWith('subscribe:post', 'post-123');
    });

    it('should reset subscription state on cleanup', async () => {
      const { unmount } = renderHook(() =>
        useRealtimeComments('post-123', { enabled: true, onCommentAdded: vi.fn() })
      );

      socket.connected = true;
      const connectHandler = vi.mocked(socket.on).mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];

      if (connectHandler) {
        connectHandler();
      }

      await waitFor(() => {
        expect(vi.mocked(socket.emit)).toHaveBeenCalledWith('subscribe:post', 'post-123');
      });

      // Unmount
      unmount();

      // Should unsubscribe
      expect(vi.mocked(socket.emit)).toHaveBeenCalledWith('unsubscribe:post', 'post-123');

      // Should cleanup event listeners
      expect(vi.mocked(socket.off)).toHaveBeenCalled();
    });

    it('should handle post_id changes correctly', async () => {
      const { rerender } = renderHook(
        ({ postId }) => useRealtimeComments(postId, { enabled: true, onCommentAdded: vi.fn() }),
        { initialProps: { postId: 'post-123' } }
      );

      socket.connected = true;
      const connectHandler = vi.mocked(socket.on).mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];

      if (connectHandler) {
        connectHandler();
      }

      await waitFor(() => {
        expect(vi.mocked(socket.emit)).toHaveBeenCalledWith('subscribe:post', 'post-123');
      });

      vi.clearAllMocks();

      // Change post_id
      rerender({ postId: 'post-456' });

      // Should unsubscribe from old and subscribe to new
      await waitFor(() => {
        expect(vi.mocked(socket.emit)).toHaveBeenCalledWith('unsubscribe:post', 'post-123');
        expect(vi.mocked(socket.emit)).toHaveBeenCalledWith('subscribe:post', 'post-456');
      });
    });
  });

  describe('Event Listener Management', () => {
    it('should register comment:new listener only once', async () => {
      const onCommentAdded = vi.fn();
      const { rerender } = renderHook(() =>
        useRealtimeComments('post-123', { enabled: true, onCommentAdded })
      );

      socket.connected = true;

      // Count how many times 'comment:new' listener is registered
      const commentNewCalls = vi.mocked(socket.on).mock.calls.filter(
        call => call[0] === 'comment:new'
      );

      expect(commentNewCalls.length).toBe(1);

      // Rerender should not add duplicate listeners
      rerender();

      const updatedCommentNewCalls = vi.mocked(socket.on).mock.calls.filter(
        call => call[0] === 'comment:new'
      );

      expect(updatedCommentNewCalls.length).toBe(1);
    });

    it('should cleanup all event listeners on unmount', async () => {
      const { unmount } = renderHook(() =>
        useRealtimeComments('post-123', { enabled: true, onCommentAdded: vi.fn() })
      );

      unmount();

      // Should remove connect, disconnect, and comment:new listeners
      const offCalls = vi.mocked(socket.off).mock.calls;
      expect(offCalls.some(call => call[0] === 'connect')).toBe(true);
      expect(offCalls.some(call => call[0] === 'disconnect')).toBe(true);
      expect(offCalls.some(call => call[0] === 'comment:new')).toBe(true);
    });
  });

  describe('Disabled State Handling', () => {
    it('should not subscribe when disabled', async () => {
      renderHook(() =>
        useRealtimeComments('post-123', { enabled: false, onCommentAdded: vi.fn() })
      );

      socket.connected = true;

      // Should not subscribe even if connected
      expect(vi.mocked(socket.emit)).not.toHaveBeenCalledWith('subscribe:post', 'post-123');
    });

    it('should unsubscribe when disabled during runtime', async () => {
      const { rerender } = renderHook(
        ({ enabled }) => useRealtimeComments('post-123', { enabled, onCommentAdded: vi.fn() }),
        { initialProps: { enabled: true } }
      );

      socket.connected = true;
      const connectHandler = vi.mocked(socket.on).mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];

      if (connectHandler) {
        connectHandler();
      }

      await waitFor(() => {
        expect(vi.mocked(socket.emit)).toHaveBeenCalledWith('subscribe:post', 'post-123');
      });

      vi.clearAllMocks();

      // Disable subscription
      rerender({ enabled: false });

      // Should unsubscribe
      expect(vi.mocked(socket.emit)).toHaveBeenCalledWith('unsubscribe:post', 'post-123');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid connect/disconnect cycles', async () => {
      renderHook(() =>
        useRealtimeComments('post-123', { enabled: true, onCommentAdded: vi.fn() })
      );

      const connectHandler = vi.mocked(socket.on).mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];

      const disconnectHandler = vi.mocked(socket.on).mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];

      // Rapid connect/disconnect
      socket.connected = true;
      if (connectHandler) connectHandler();

      socket.connected = false;
      if (disconnectHandler) disconnectHandler();

      socket.connected = true;
      if (connectHandler) connectHandler();

      // Should handle gracefully without duplicate subscriptions
      const subscribeCalls = vi.mocked(socket.emit).mock.calls.filter(
        call => call[0] === 'subscribe:post'
      );

      // Should have subscribed, but state tracking should prevent duplicates
      expect(subscribeCalls.length).toBeGreaterThan(0);
    });

    it('should handle missing post_id gracefully', async () => {
      renderHook(() =>
        useRealtimeComments('', { enabled: true, onCommentAdded: vi.fn() })
      );

      socket.connected = true;

      // Should not attempt subscription with empty post_id
      expect(vi.mocked(socket.emit)).not.toHaveBeenCalledWith('subscribe:post', '');
    });
  });
});
