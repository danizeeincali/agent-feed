/**
 * TDD Test: WebSocket Singleton Pattern Validation
 * Tests that singleton pattern is properly enforced and prevents connection leaks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocketSingleton, getWebSocketSingletonDebugInfo } from '@/hooks/useWebSocketSingleton';

// Mock Socket.IO
const mockSocket = {
  connected: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  onAny: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  default: vi.fn(() => mockSocket),
}));

describe('WebSocket Singleton Pattern', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton state
    mockSocket.connected = false;
  });

  afterEach(() => {
    // Clean up any connections
    act(() => {
      const debugInfo = getWebSocketSingletonDebugInfo();
      if (debugInfo.hasGlobalSocket) {
        mockSocket.disconnect();
      }
    });
  });

  it('should create only one global socket instance across multiple hook instances', () => {
    const options = { url: 'http://localhost:3000', autoConnect: false };
    
    // Create multiple hook instances
    const { result: hook1 } = renderHook(() => useWebSocketSingleton(options));
    const { result: hook2 } = renderHook(() => useWebSocketSingleton(options));
    const { result: hook3 } = renderHook(() => useWebSocketSingleton(options));

    // All hooks should reference the same socket instance
    expect(hook1.current.socket).toBe(hook2.current.socket);
    expect(hook2.current.socket).toBe(hook3.current.socket);
    
    // Debug info should show single socket with 3 connections
    const debugInfo = getWebSocketSingletonDebugInfo();
    expect(debugInfo.connectionCount).toBe(3);
    expect(debugInfo.hasGlobalSocket).toBe(true);
  });

  it('should prevent connection leaks when components unmount', () => {
    const options = { url: 'http://localhost:3000', autoConnect: false };
    
    // Create and unmount multiple hooks
    const { unmount: unmount1 } = renderHook(() => useWebSocketSingleton(options));
    const { unmount: unmount2 } = renderHook(() => useWebSocketSingleton(options));
    const { result, unmount: unmount3 } = renderHook(() => useWebSocketSingleton(options));

    // Verify 3 connections
    expect(getWebSocketSingletonDebugInfo().connectionCount).toBe(3);

    // Unmount first two
    act(() => {
      unmount1();
      unmount2();
    });

    // Should still have socket as one component remains
    expect(getWebSocketSingletonDebugInfo().connectionCount).toBe(1);
    expect(getWebSocketSingletonDebugInfo().hasGlobalSocket).toBe(true);
    expect(mockSocket.disconnect).not.toHaveBeenCalled();

    // Unmount last component
    act(() => {
      unmount3();
    });

    // Now socket should be disconnected and cleaned up
    expect(getWebSocketSingletonDebugInfo().connectionCount).toBe(0);
    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
  });

  it('should reuse existing connection when new components mount', () => {
    const options = { url: 'http://localhost:3000', autoConnect: true };
    mockSocket.connected = true;

    // Create first hook
    const { result: hook1 } = renderHook(() => useWebSocketSingleton(options));
    
    // Simulate connection
    act(() => {
      hook1.current.connect();
    });

    // Create second hook after first is connected
    const { result: hook2 } = renderHook(() => useWebSocketSingleton(options));

    // Both should share the same connected socket
    expect(hook1.current.socket).toBe(hook2.current.socket);
    expect(hook1.current.isConnected).toBe(hook2.current.isConnected);
    
    // Connection should only be called once
    expect(mockSocket.connect).toHaveBeenCalledTimes(1);
  });

  it('should handle connection state updates across all hook instances', () => {
    const options = { url: 'http://localhost:3000', autoConnect: false };
    
    const { result: hook1 } = renderHook(() => useWebSocketSingleton(options));
    const { result: hook2 } = renderHook(() => useWebSocketSingleton(options));

    // Initially disconnected
    expect(hook1.current.isConnected).toBe(false);
    expect(hook2.current.isConnected).toBe(false);

    // Simulate connection through first hook
    act(() => {
      mockSocket.connected = true;
      hook1.current.connect();
    });

    // Both hooks should reflect connected state
    expect(hook1.current.isConnected).toBe(true);
    expect(hook2.current.isConnected).toBe(true);
  });

  it('should emit events through shared socket instance', () => {
    const options = { url: 'http://localhost:3000', autoConnect: false };
    mockSocket.connected = true;
    
    const { result: hook1 } = renderHook(() => useWebSocketSingleton(options));
    const { result: hook2 } = renderHook(() => useWebSocketSingleton(options));

    // Emit from different hook instances
    act(() => {
      hook1.current.emit('test1', { data: 'from hook1' });
      hook2.current.emit('test2', { data: 'from hook2' });
    });

    // Both emissions should go through the same socket
    expect(mockSocket.emit).toHaveBeenCalledWith('test1', { data: 'from hook1' });
    expect(mockSocket.emit).toHaveBeenCalledWith('test2', { data: 'from hook2' });
    expect(mockSocket.emit).toHaveBeenCalledTimes(2);
  });

  it('should maintain singleton across different URLs (warning case)', () => {
    // This tests edge case behavior - singleton should maintain one connection
    // even if different URLs are requested (first URL wins)
    
    const { result: hook1 } = renderHook(() => 
      useWebSocketSingleton({ url: 'http://localhost:3000', autoConnect: false })
    );
    
    const { result: hook2 } = renderHook(() => 
      useWebSocketSingleton({ url: 'http://localhost:4000', autoConnect: false })
    );

    // Both should share the same socket (first URL wins)
    expect(hook1.current.socket).toBe(hook2.current.socket);
    
    // Only one socket instance should exist
    const debugInfo = getWebSocketSingletonDebugInfo();
    expect(debugInfo.connectionCount).toBe(2);
    expect(debugInfo.hasGlobalSocket).toBe(true);
  });

  it('should provide accurate debug information', () => {
    const options = { url: 'http://localhost:3000', autoConnect: false };
    
    // Initial state
    expect(getWebSocketSingletonDebugInfo().connectionCount).toBe(0);
    expect(getWebSocketSingletonDebugInfo().hasGlobalSocket).toBe(false);

    // Create hooks
    const { unmount: unmount1 } = renderHook(() => useWebSocketSingleton(options));
    const { unmount: unmount2 } = renderHook(() => useWebSocketSingleton(options));

    const debugInfo = getWebSocketSingletonDebugInfo();
    expect(debugInfo.connectionCount).toBe(2);
    expect(debugInfo.hasGlobalSocket).toBe(true);
    expect(debugInfo.isConnected).toBe(false);

    // Clean up
    act(() => {
      unmount1();
      unmount2();
    });

    expect(getWebSocketSingletonDebugInfo().connectionCount).toBe(0);
  });
});

describe('WebSocket Connection Leak Prevention', () => {
  it('should never exceed maximum expected connections in stress test', async () => {
    const options = { url: 'http://localhost:3000', autoConnect: false };
    const hooks: Array<() => void> = [];

    // Create many hook instances rapidly
    for (let i = 0; i < 50; i++) {
      const { unmount } = renderHook(() => useWebSocketSingleton(options));
      hooks.push(unmount);
    }

    // Should still have only one global socket
    const debugInfo = getWebSocketSingletonDebugInfo();
    expect(debugInfo.connectionCount).toBe(50);
    expect(debugInfo.hasGlobalSocket).toBe(true);

    // Unmount all at once
    act(() => {
      hooks.forEach(unmount => unmount());
    });

    // Should be completely cleaned up
    expect(getWebSocketSingletonDebugInfo().connectionCount).toBe(0);
    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
  });

  it('should handle rapid mount/unmount cycles without leaks', () => {
    const options = { url: 'http://localhost:3000', autoConnect: false };

    // Rapid mount/unmount cycles
    for (let i = 0; i < 10; i++) {
      const { unmount } = renderHook(() => useWebSocketSingleton(options));
      
      // Unmount immediately
      act(() => {
        unmount();
      });
    }

    // Should be clean state
    expect(getWebSocketSingletonDebugInfo().connectionCount).toBe(0);
    expect(getWebSocketSingletonDebugInfo().hasGlobalSocket).toBe(false);
  });
});