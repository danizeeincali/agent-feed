/**
 * useTerminalSocket Hook Tests
 * 
 * Comprehensive unit tests for the useTerminalSocket hook following TDD principles.
 * Tests WebSocket connection management, cross-tab synchronization, error handling,
 * auto-reconnection, and heartbeat functionality.
 */

import { renderHook, act } from '@testing-library/react';
import { io, Socket } from 'socket.io-client';
import { useTerminalSocket } from '@/hooks/useTerminalSocket';

// Mock socket.io-client
const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connected: false,
  id: 'mock-socket-id'
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket)
}));

// Mock BroadcastChannel
const mockBroadcastChannel = {
  postMessage: jest.fn(),
  close: jest.fn(),
  onmessage: null
};

global.BroadcastChannel = jest.fn(() => mockBroadcastChannel) as any;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock console methods to reduce noise during tests
console.log = jest.fn();
console.error = jest.fn();
console.warn = jest.fn();

describe('useTerminalSocket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset mock socket
    mockSocket.connected = false;
    mockSocket.on.mockClear();
    mockSocket.emit.mockClear();
    mockSocket.disconnect.mockClear();
    
    // Reset localStorage mocks
    mockLocalStorage.getItem.mockReturnValue('mock-auth-token');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('returns initial state values', () => {
      const { result } = renderHook(() => useTerminalSocket());

      expect(result.current.connected).toBe(false);
      expect(result.current.connecting).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.instanceInfo).toBe(null);
      expect(result.current.history).toEqual([]);
      expect(result.current.lastActivity).toBe(null);
    });

    it('provides action functions', () => {
      const { result } = renderHook(() => useTerminalSocket());

      expect(typeof result.current.connect).toBe('function');
      expect(typeof result.current.disconnect).toBe('function');
      expect(typeof result.current.sendInput).toBe('function');
      expect(typeof result.current.sendResize).toBe('function');
      expect(typeof result.current.clearHistory).toBe('function');
    });

    it('provides computed values', () => {
      const { result } = renderHook(() => useTerminalSocket());

      expect(result.current.canSendInput).toBe(false);
      expect(result.current.connectionQuality).toBe('good');
      expect(result.current.stats).toBeDefined();
    });
  });

  describe('Connection Establishment', () => {
    it('creates socket connection with correct configuration', () => {
      const { result } = renderHook(() => useTerminalSocket());

      act(() => {
        result.current.connect('test-instance-123');
      });

      expect(io).toHaveBeenCalledWith('http://localhost:3001', {
        auth: {
          token: 'mock-auth-token',
          userId: expect.any(String),
          username: expect.any(String)
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: false
      });
    });

    it('sets up cross-tab synchronization', () => {
      const { result } = renderHook(() => useTerminalSocket());

      act(() => {
        result.current.connect('test-instance-123');
      });

      expect(BroadcastChannel).toHaveBeenCalledWith('terminal-test-instance-123');
    });

    it('updates state to connecting', () => {
      const { result } = renderHook(() => useTerminalSocket());

      act(() => {
        result.current.connect('test-instance-123');
      });

      expect(result.current.connecting).toBe(true);
      expect(result.current.error).toBe(null);
      expect(result.current.history).toEqual([]);
    });

    it('emits connect_terminal event after socket connection', () => {
      const { result } = renderHook(() => useTerminalSocket());

      act(() => {
        result.current.connect('test-instance-123');
      });

      // Simulate socket connected event
      const connectedCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connected'
      )?.[1];

      act(() => {
        connectedCallback();
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('connect_terminal', {
        instanceId: 'test-instance-123'
      });
    });
  });

  describe('Socket Event Handling', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });
    });

    it('handles terminal_connected event', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      const connectedCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'terminal_connected'
      )?.[1];

      const mockInstanceData = {
        instanceId: 'test-instance-123',
        instanceName: 'Test Instance',
        instanceType: 'claude',
        pid: 12345,
        sessionId: 'session-123',
        clientCount: 1
      };

      act(() => {
        connectedCallback(mockInstanceData);
      });

      expect(result.current.connected).toBe(true);
      expect(result.current.connecting).toBe(false);
      expect(result.current.instanceInfo).toEqual({
        id: 'test-instance-123',
        name: 'Test Instance',
        type: 'claude',
        pid: 12345,
        sessionId: 'session-123',
        clientCount: 1
      });
    });

    it('handles terminal_data event', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      const dataCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'terminal_data'
      )?.[1];

      act(() => {
        dataCallback({
          data: 'Hello, terminal!',
          timestamp: '2024-01-01T00:00:00Z',
          isHistory: false
        });
      });

      expect(result.current.history).toContain('Hello, terminal!');
      expect(result.current.lastActivity).toBeInstanceOf(Date);
    });

    it('handles history data separately', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      const dataCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'terminal_data'
      )?.[1];

      act(() => {
        dataCallback({
          data: 'Historical data',
          timestamp: '2024-01-01T00:00:00Z',
          isHistory: true
        });
      });

      expect(result.current.history).toEqual(['Historical data']);
    });

    it('handles error events', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      const errorCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      act(() => {
        errorCallback({ message: 'Connection failed' });
      });

      expect(result.current.connected).toBe(false);
      expect(result.current.connecting).toBe(false);
      expect(result.current.error).toBe('Connection failed');
    });

    it('handles disconnect events', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      const disconnectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];

      act(() => {
        disconnectCallback('transport close');
      });

      expect(result.current.connected).toBe(false);
      expect(result.current.connecting).toBe(false);
    });

    it('handles instance_destroyed event', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      const destroyedCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'instance_destroyed'
      )?.[1];

      act(() => {
        destroyedCallback({ instanceId: 'test-instance-123' });
      });

      expect(result.current.connected).toBe(false);
      expect(result.current.error).toBe('Instance has been destroyed');
    });
  });

  describe('Input and Resize Handling', () => {
    it('sends input when connected', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      // Simulate connected state
      mockSocket.connected = true;

      act(() => {
        result.current.sendInput('test input');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('terminal_input', {
        data: 'test input'
      });
    });

    it('does not send input when disconnected', () => {
      const { result } = renderHook(() => useTerminalSocket());

      act(() => {
        result.current.sendInput('test input');
      });

      expect(mockSocket.emit).not.toHaveBeenCalledWith('terminal_input', expect.any(Object));
    });

    it('sends resize events when connected', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      mockSocket.connected = true;

      act(() => {
        result.current.sendResize(80, 24);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('terminal_resize', {
        cols: 80,
        rows: 24
      });
    });

    it('does not send resize when disconnected', () => {
      const { result } = renderHook(() => useTerminalSocket());

      act(() => {
        result.current.sendResize(80, 24);
      });

      expect(mockSocket.emit).not.toHaveBeenCalledWith('terminal_resize', expect.any(Object));
    });
  });

  describe('Cross-Tab Synchronization', () => {
    it('broadcasts terminal data to other tabs', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      const dataCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'terminal_data'
      )?.[1];

      act(() => {
        dataCallback({
          data: 'broadcast test',
          timestamp: '2024-01-01T00:00:00Z',
          isHistory: false
        });
      });

      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith({
        type: 'terminal_data',
        data: expect.objectContaining({
          content: 'broadcast test',
          senderId: 'mock-socket-id'
        })
      });
    });

    it('broadcasts connection status to other tabs', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      const connectedCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'terminal_connected'
      )?.[1];

      act(() => {
        connectedCallback({
          instanceId: 'test-instance-123',
          instanceName: 'Test Instance'
        });
      });

      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith({
        type: 'connection_status',
        data: expect.objectContaining({
          connected: true,
          connecting: false,
          error: null
        })
      });
    });

    it('handles incoming messages from other tabs', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      // Simulate receiving message from another tab
      const incomingMessage = {
        data: {
          type: 'terminal_data',
          data: {
            content: 'data from other tab',
            senderId: 'other-socket-id' // Different from our socket ID
          }
        }
      };

      act(() => {
        if (mockBroadcastChannel.onmessage) {
          mockBroadcastChannel.onmessage(incomingMessage);
        }
      });

      expect(result.current.history).toContain('data from other tab');
    });

    it('ignores own messages in cross-tab sync', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      const initialHistoryLength = result.current.history.length;

      // Simulate receiving our own message
      const incomingMessage = {
        data: {
          type: 'terminal_data',
          data: {
            content: 'own message',
            senderId: 'mock-socket-id' // Same as our socket ID
          }
        }
      };

      act(() => {
        if (mockBroadcastChannel.onmessage) {
          mockBroadcastChannel.onmessage(incomingMessage);
        }
      });

      expect(result.current.history.length).toBe(initialHistoryLength);
    });
  });

  describe('Heartbeat System', () => {
    it('starts heartbeat on connection', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      const connectedCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'terminal_connected'
      )?.[1];

      act(() => {
        connectedCallback({
          instanceId: 'test-instance-123'
        });
      });

      // Fast-forward to trigger heartbeat
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('ping');
    });

    it('handles pong responses', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      const pongCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'pong'
      )?.[1];

      const initialActivity = result.current.lastActivity;

      act(() => {
        pongCallback({});
      });

      expect(result.current.lastActivity).not.toBe(initialActivity);
    });

    it('stops heartbeat on disconnect', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      act(() => {
        result.current.disconnect();
      });

      // Should not emit ping after disconnect
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockSocket.emit).not.toHaveBeenCalledWith('ping');
    });
  });

  describe('Auto-Reconnection', () => {
    it('schedules reconnection on disconnect', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      const disconnectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];

      act(() => {
        disconnectCallback('transport close');
      });

      // Should schedule reconnection
      expect(setTimeout).toHaveBeenCalled();
    });

    it('uses exponential backoff for reconnections', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      // Simulate multiple disconnections
      const disconnectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];

      for (let i = 0; i < 3; i++) {
        act(() => {
          disconnectCallback('transport close');
        });
      }

      // Should have increasing delays (exponential backoff)
      const timeoutCalls = (setTimeout as jest.Mock).mock.calls;
      expect(timeoutCalls.length).toBeGreaterThan(1);
    });

    it('limits maximum reconnection attempts', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      const errorCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )?.[1];

      // Simulate many connection failures
      for (let i = 0; i < 15; i++) {
        act(() => {
          errorCallback({ message: 'Connection failed' });
        });
      }

      // Should not exceed maximum attempts (implementation specific)
      expect(result.current.stats.reconnectAttempts).toBeLessThanOrEqual(10);
    });

    it('resets reconnect attempts on successful connection', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      // Simulate failed connection
      const errorCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )?.[1];

      act(() => {
        errorCallback({ message: 'Connection failed' });
      });

      expect(result.current.stats.reconnectAttempts).toBeGreaterThan(0);

      // Simulate successful reconnection
      const connectedCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'terminal_connected'
      )?.[1];

      act(() => {
        connectedCallback({
          instanceId: 'test-instance-123'
        });
      });

      expect(result.current.stats.reconnectAttempts).toBe(0);
    });
  });

  describe('History Management', () => {
    it('maintains maximum history size', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      const dataCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'terminal_data'
      )?.[1];

      // Add more than MAX_HISTORY_SIZE entries
      for (let i = 0; i < 10005; i++) {
        act(() => {
          dataCallback({
            data: `line ${i}`,
            timestamp: '2024-01-01T00:00:00Z',
            isHistory: false
          });
        });
      }

      expect(result.current.history.length).toBeLessThanOrEqual(10000);
    });

    it('clears history on new connection', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      // Add some history
      act(() => {
        result.current.connect('test-instance-123');
      });

      const dataCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'terminal_data'
      )?.[1];

      act(() => {
        dataCallback({
          data: 'some data',
          timestamp: '2024-01-01T00:00:00Z',
          isHistory: false
        });
      });

      expect(result.current.history.length).toBeGreaterThan(0);

      // Connect to different instance
      act(() => {
        result.current.connect('different-instance');
      });

      expect(result.current.history.length).toBe(0);
    });

    it('can clear history manually', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      const dataCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'terminal_data'
      )?.[1];

      act(() => {
        dataCallback({
          data: 'some data',
          timestamp: '2024-01-01T00:00:00Z',
          isHistory: false
        });
      });

      expect(result.current.history.length).toBeGreaterThan(0);

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.history.length).toBe(0);
    });
  });

  describe('Page Visibility Handling', () => {
    it('reconnects when page becomes visible', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      // Simulate connection and then disconnection
      act(() => {
        result.current.connect('test-instance-123');
      });

      act(() => {
        result.current.disconnect();
      });

      // Mock document visibility change
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true
      });

      const visibilityChangeEvent = new Event('visibilitychange');
      
      act(() => {
        document.dispatchEvent(visibilityChangeEvent);
      });

      // Should attempt to reconnect (mocked connection call)
      expect(io).toHaveBeenCalledTimes(2); // Initial connection + reconnection
    });
  });

  describe('Disconnect and Cleanup', () => {
    it('disconnects socket and cleans up resources', () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      act(() => {
        result.current.disconnect();
      });

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockBroadcastChannel.close).toHaveBeenCalled();
      expect(result.current.connected).toBe(false);
      expect(result.current.instanceInfo).toBe(null);
    });

    it('cleans up on unmount', () => {
      const { result, unmount } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance-123');
      });

      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockBroadcastChannel.close).toHaveBeenCalled();
    });
  });

  describe('Computed Values', () => {
    it('calculates canSendInput correctly', () => {
      const { result } = renderHook(() => useTerminalSocket());

      expect(result.current.canSendInput).toBe(false);

      act(() => {
        result.current.connect('test-instance-123');
      });

      // Still false while connecting
      expect(result.current.canSendInput).toBe(false);

      // Simulate connected state
      const connectedCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'terminal_connected'
      )?.[1];

      act(() => {
        connectedCallback({
          instanceId: 'test-instance-123'
        });
      });

      expect(result.current.canSendInput).toBe(true);
    });

    it('calculates connection quality based on retry attempts', () => {
      const { result } = renderHook(() => useTerminalSocket());

      expect(result.current.connectionQuality).toBe('good');

      // Simulate some connection failures
      act(() => {
        result.current.connect('test-instance-123');
      });

      const errorCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )?.[1];

      // First failure
      act(() => {
        errorCallback({ message: 'Connection failed' });
      });

      expect(result.current.connectionQuality).toBe('fair');

      // More failures
      act(() => {
        errorCallback({ message: 'Connection failed' });
      });
      act(() => {
        errorCallback({ message: 'Connection failed' });
      });

      expect(result.current.connectionQuality).toBe('poor');
    });

    it('provides accurate stats', () => {
      const { result } = renderHook(() => useTerminalSocket());

      expect(result.current.stats.reconnectAttempts).toBe(0);
      expect(result.current.stats.historySize).toBe(0);
      expect(result.current.stats.clientCount).toBe(0);

      // Add some history and simulate instance info
      act(() => {
        result.current.connect('test-instance-123');
      });

      const dataCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'terminal_data'
      )?.[1];

      act(() => {
        dataCallback({
          data: 'test data',
          timestamp: '2024-01-01T00:00:00Z',
          isHistory: false
        });
      });

      const connectedCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'terminal_connected'
      )?.[1];

      act(() => {
        connectedCallback({
          instanceId: 'test-instance-123',
          clientCount: 3
        });
      });

      expect(result.current.stats.historySize).toBe(1);
      expect(result.current.stats.clientCount).toBe(3);
    });
  });
});