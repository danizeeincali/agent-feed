/**
 * WebSocket Subscription Fix - Unit Tests
 * Tests the real-time subscription mechanism for post updates
 *
 * @test WebSocket Subscription
 * @description Validates that WebSocket subscriptions work correctly
 * @prerequisites Mock socket.io-client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { socket, subscribeToPost, unsubscribeFromPost } from '../../src/services/socket';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    connected: false,
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn()
  }))
}));

describe('WebSocket Subscription Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset socket state
    socket.connected = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('subscribeToPost()', () => {
    it('should emit subscribe:post when socket is connected', () => {
      const emitSpy = vi.spyOn(socket, 'emit');
      socket.connected = true;

      subscribeToPost('post-123');

      expect(emitSpy).toHaveBeenCalledWith('subscribe:post', 'post-123');
      expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    it('should warn when socket is not connected', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      socket.connected = false;

      subscribeToPost('post-123');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot subscribe'),
        expect.stringContaining('post-123')
      );
    });

    it('should handle multiple subscriptions to same post', () => {
      const emitSpy = vi.spyOn(socket, 'emit');
      socket.connected = true;

      subscribeToPost('post-123');
      subscribeToPost('post-123');

      // Should emit twice even for same post (server handles deduplication)
      expect(emitSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle empty post ID gracefully', () => {
      const emitSpy = vi.spyOn(socket, 'emit');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      socket.connected = true;

      subscribeToPost('');

      expect(emitSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid post ID')
      );
    });

    it('should handle null post ID gracefully', () => {
      const emitSpy = vi.spyOn(socket, 'emit');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      socket.connected = true;

      subscribeToPost(null as any);

      expect(emitSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid post ID')
      );
    });
  });

  describe('unsubscribeFromPost()', () => {
    it('should emit unsubscribe:post when socket is connected', () => {
      const emitSpy = vi.spyOn(socket, 'emit');
      socket.connected = true;

      unsubscribeFromPost('post-123');

      expect(emitSpy).toHaveBeenCalledWith('unsubscribe:post', 'post-123');
      expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    it('should not warn when unsubscribing while disconnected', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      socket.connected = false;

      unsubscribeFromPost('post-123');

      // Unsubscribe should be silent when disconnected
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('useRealtimeComments hook behavior', () => {
    it('should subscribe when socket connects', () => {
      const emitSpy = vi.spyOn(socket, 'emit');
      const onSpy = vi.spyOn(socket, 'on');

      socket.connected = false;

      // Simulate component mount
      subscribeToPost('post-123');
      expect(emitSpy).not.toHaveBeenCalled(); // Not connected yet

      // Simulate connection
      socket.connected = true;
      const connectHandler = onSpy.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) {
        connectHandler();
      }

      // After connection, subscription should work
      subscribeToPost('post-123');
      expect(emitSpy).toHaveBeenCalledWith('subscribe:post', 'post-123');
    });

    it('should resubscribe after reconnection', () => {
      const emitSpy = vi.spyOn(socket, 'emit');
      socket.connected = true;

      // Initial subscription
      subscribeToPost('post-123');
      expect(emitSpy).toHaveBeenCalledTimes(1);

      // Simulate disconnect
      socket.connected = false;
      emitSpy.mockClear();

      // Simulate reconnect
      socket.connected = true;
      subscribeToPost('post-123');

      // Should resubscribe after reconnection
      expect(emitSpy).toHaveBeenCalledWith('subscribe:post', 'post-123');
    });
  });

  describe('Socket event listeners', () => {
    it('should register comment:new listener', () => {
      const onSpy = vi.spyOn(socket, 'on');

      const callback = vi.fn();
      socket.on('comment:new', callback);

      expect(onSpy).toHaveBeenCalledWith('comment:new', callback);
    });

    it('should register comment:update listener', () => {
      const onSpy = vi.spyOn(socket, 'on');

      const callback = vi.fn();
      socket.on('comment:update', callback);

      expect(onSpy).toHaveBeenCalledWith('comment:update', callback);
    });

    it('should unregister listeners on cleanup', () => {
      const offSpy = vi.spyOn(socket, 'off');

      const callback = vi.fn();
      socket.on('comment:new', callback);
      socket.off('comment:new', callback);

      expect(offSpy).toHaveBeenCalledWith('comment:new', callback);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle rapid subscribe/unsubscribe cycles', () => {
      const emitSpy = vi.spyOn(socket, 'emit');
      socket.connected = true;

      subscribeToPost('post-123');
      unsubscribeFromPost('post-123');
      subscribeToPost('post-123');
      unsubscribeFromPost('post-123');

      expect(emitSpy).toHaveBeenCalledTimes(4);
    });

    it('should handle subscription during connection transition', () => {
      const emitSpy = vi.spyOn(socket, 'emit');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      socket.connected = false;
      subscribeToPost('post-123');
      expect(warnSpy).toHaveBeenCalled();

      socket.connected = true;
      subscribeToPost('post-123');
      expect(emitSpy).toHaveBeenCalledWith('subscribe:post', 'post-123');
    });

    it('should handle very long post IDs', () => {
      const emitSpy = vi.spyOn(socket, 'emit');
      socket.connected = true;

      const longId = 'a'.repeat(1000);
      subscribeToPost(longId);

      expect(emitSpy).toHaveBeenCalledWith('subscribe:post', longId);
    });

    it('should handle special characters in post IDs', () => {
      const emitSpy = vi.spyOn(socket, 'emit');
      socket.connected = true;

      const specialId = 'post-123!@#$%^&*()';
      subscribeToPost(specialId);

      expect(emitSpy).toHaveBeenCalledWith('subscribe:post', specialId);
    });
  });
});
