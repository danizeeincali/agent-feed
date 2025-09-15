/**
 * Unit Tests for SSE Connection Manager
 *
 * Tests SSE connection management including:
 * - Connection lifecycle
 * - Error handling and recovery
 * - Message routing
 * - Heartbeat monitoring
 * - Reconnection logic
 */

import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { SSEConnectionManager, ConnectionState, ConnectionConfig } from '../../../services/SSEConnectionManager';

// Mock EventSource
class MockEventSource {
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readyState: number = EventSource.CONNECTING;
  public url: string;

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      this.readyState = EventSource.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  close() {
    this.readyState = EventSource.CLOSED;
  }

  // Test helper methods
  simulateMessage(data: any) {
    const event = new MessageEvent('message', {
      data: JSON.stringify(data)
    });
    this.onmessage?.(event);
  }

  simulateError() {
    this.readyState = EventSource.CLOSED;
    this.onerror?.(new Event('error'));
  }
}

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock EventSource
global.EventSource = MockEventSource as any;

describe('SSEConnectionManager', () => {
  let connectionManager: SSEConnectionManager;
  let mockConfig: ConnectionConfig;
  let eventListeners: { [key: string]: Function[] };

  beforeEach(() => {
    vi.clearAllMocks();
    eventListeners = {};

    mockConfig = {
      instanceId: 'claude-test-123',
      baseUrl: 'http://localhost:3001',
      maxReconnectAttempts: 3,
      reconnectDelay: 100,
      maxBackoffDelay: 1000,
      heartbeatTimeout: 5000
    };

    // Mock successful instance validation
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        instances: [
          { id: 'claude-test-123', status: 'running' }
        ]
      })
    });

    connectionManager = new SSEConnectionManager(mockConfig);

    // Track event listeners for testing
    const originalOn = connectionManager.on.bind(connectionManager);
    connectionManager.on = vi.fn((event: string, listener: Function) => {
      if (!eventListeners[event]) {
        eventListeners[event] = [];
      }
      eventListeners[event].push(listener);
      return originalOn(event, listener);
    });
  });

  afterEach(() => {
    connectionManager.destroy();
    vi.clearAllTimers();
  });

  describe('Connection Lifecycle', () => {
    it('should establish SSE connection successfully', async () => {
      const connectPromise = connectionManager.connect();

      expect(connectionManager.getConnectionStatus().state).toBe(ConnectionState.CONNECTING);

      await connectPromise;

      expect(connectionManager.getConnectionStatus()).toMatchObject({
        state: ConnectionState.CONNECTED,
        instanceId: null,
        connectionType: 'sse',
        reconnectAttempts: 0,
        error: null
      });
    });

    it('should validate instance before connecting', async () => {
      await connectionManager.connect();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/claude/instances'
      );
    });

    it('should reject connection for invalid instance ID', async () => {
      const invalidConfig = { ...mockConfig, instanceId: 'invalid-id' };
      const invalidManager = new SSEConnectionManager(invalidConfig);

      await expect(invalidManager.connect()).rejects.toThrow(
        'Invalid instance ID format: invalid-id'
      );
    });

    it('should reject connection for non-running instance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          instances: [
            { id: 'claude-test-123', status: 'stopped' }
          ]
        })
      });

      await expect(connectionManager.connect()).rejects.toThrow(
        'Instance claude-test-123 is not running or does not exist'
      );
    });

    it('should disconnect cleanly', async () => {
      await connectionManager.connect();

      connectionManager.disconnect();

      expect(connectionManager.getConnectionStatus()).toMatchObject({
        state: ConnectionState.DISCONNECTED,
        connectionType: 'none',
        instanceId: null
      });
    });
  });

  describe('Message Handling', () => {
    let mockEventSource: MockEventSource;

    beforeEach(async () => {
      await connectionManager.connect();
      mockEventSource = (global.EventSource as any).mock.instances[0];
    });

    it('should handle terminal output messages', () => {
      const outputData = {
        type: 'output',
        data: 'Hello World\n',
        instanceId: 'claude-test-123',
        isReal: true,
        timestamp: '2024-01-15T10:30:00Z'
      };

      mockEventSource.simulateMessage(outputData);

      const terminalListeners = eventListeners['terminal:output'];
      expect(terminalListeners).toBeDefined();
      expect(terminalListeners[0]).toHaveBeenCalledWith({
        output: 'Hello World\n',
        instanceId: 'claude-test-123',
        isReal: true,
        timestamp: '2024-01-15T10:30:00Z'
      });
    });

    it('should handle status update messages', () => {
      const statusData = {
        type: 'instance:status',
        instanceId: 'claude-test-123',
        status: 'running',
        timestamp: '2024-01-15T10:30:00Z'
      };

      mockEventSource.simulateMessage(statusData);

      const statusListeners = eventListeners['instance:status'];
      expect(statusListeners).toBeDefined();
      expect(statusListeners[0]).toHaveBeenCalledWith({
        instanceId: 'claude-test-123',
        status: 'running',
        timestamp: '2024-01-15T10:30:00Z'
      });
    });

    it('should handle heartbeat messages', () => {
      const heartbeatData = {
        type: 'heartbeat',
        timestamp: '2024-01-15T10:30:00Z'
      };

      mockEventSource.simulateMessage(heartbeatData);

      // Should update last activity but not emit specific event
      expect(connectionManager.getConnectionStatus().lastActivity).toBeTruthy();
    });

    it('should emit raw messages for debugging', () => {
      const testData = {
        type: 'test',
        content: 'test message'
      };

      mockEventSource.simulateMessage(testData);

      const rawListeners = eventListeners['raw_message'];
      expect(rawListeners).toBeDefined();
      expect(rawListeners[0]).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test',
          data: testData,
          timestamp: expect.any(String)
        })
      );
    });

    it('should handle malformed JSON messages gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Simulate malformed JSON
      const malformedEvent = new MessageEvent('message', {
        data: 'invalid json {'
      });
      mockEventSource.onmessage?.(malformedEvent);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SSEConnectionManager] Message parsing error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Command Sending', () => {
    beforeEach(async () => {
      await connectionManager.connect();
    });

    it('should send commands via HTTP POST', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await connectionManager.sendCommand('ls -la');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/claude/instances/claude-test-123/terminal/input',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            input: 'ls -la\n'
          })
        }
      );
    });

    it('should reject empty commands', async () => {
      await expect(connectionManager.sendCommand('')).rejects.toThrow(
        'Command cannot be empty'
      );

      await expect(connectionManager.sendCommand('   ')).rejects.toThrow(
        'Command cannot be empty'
      );
    });

    it('should reject commands when not connected', async () => {
      connectionManager.disconnect();

      await expect(connectionManager.sendCommand('test')).rejects.toThrow(
        'Not connected to instance'
      );
    });

    it('should handle command send failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(connectionManager.sendCommand('test')).rejects.toThrow(
        'HTTP 500: Internal Server Error'
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    let mockEventSource: MockEventSource;

    beforeEach(async () => {
      await connectionManager.connect();
      mockEventSource = (global.EventSource as any).mock.instances[0];
    });

    it('should handle connection errors', () => {
      mockEventSource.simulateError();

      expect(connectionManager.getConnectionStatus().state).toBe(ConnectionState.ERROR);

      const errorListeners = eventListeners['error'];
      expect(errorListeners).toBeDefined();
      expect(errorListeners[0]).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'SSE connection error',
          instanceId: 'claude-test-123',
          reconnectAttempts: expect.any(Number)
        })
      );
    });

    it('should attempt reconnection on error', async () => {
      vi.useFakeTimers();

      mockEventSource.simulateError();

      expect(connectionManager.getConnectionStatus().state).toBe(ConnectionState.ERROR);

      // Fast-forward to trigger reconnection
      vi.advanceTimersByTime(1000);

      expect(connectionManager.getConnectionStatus().state).toBe(ConnectionState.RECONNECTING);

      vi.useRealTimers();
    });

    it('should respect max reconnection attempts', async () => {
      vi.useFakeTimers();

      // Simulate multiple failures
      for (let i = 0; i < 4; i++) {
        mockEventSource.simulateError();
        vi.advanceTimersByTime(2000);
      }

      const maxReconnectListeners = eventListeners['max_reconnect_reached'];
      expect(maxReconnectListeners).toBeDefined();
      expect(maxReconnectListeners[0]).toHaveBeenCalledWith({
        instanceId: 'claude-test-123',
        attempts: 3
      });

      vi.useRealTimers();
    });

    it('should implement exponential backoff', () => {
      const manager = new SSEConnectionManager({
        ...mockConfig,
        reconnectDelay: 1000,
        maxBackoffDelay: 10000
      });

      // Access private method for testing
      const calculateBackoff = (manager as any).calculateBackoffDelay.bind(manager);

      expect(calculateBackoff(1)).toBeLessThan(2000);
      expect(calculateBackoff(2)).toBeLessThan(4000);
      expect(calculateBackoff(3)).toBeLessThan(8000);
      expect(calculateBackoff(10)).toBeLessThan(10000); // Should cap at maxBackoffDelay
    });
  });

  describe('Heartbeat Monitoring', () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      await connectionManager.connect();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should monitor heartbeat timeout', () => {
      // Fast-forward past heartbeat timeout
      vi.advanceTimersByTime(6000);

      const timeoutListeners = eventListeners['heartbeat_timeout'];
      expect(timeoutListeners).toBeDefined();
      expect(timeoutListeners[0]).toHaveBeenCalledWith(
        expect.objectContaining({
          instanceId: 'claude-test-123',
          lastHeartbeat: expect.any(Date)
        })
      );
    });

    it('should reset heartbeat on message receipt', () => {
      const mockEventSource = (global.EventSource as any).mock.instances[0];

      // Send heartbeat message
      mockEventSource.simulateMessage({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      });

      // Fast-forward, but not enough to trigger timeout
      vi.advanceTimersByTime(3000);

      const timeoutListeners = eventListeners['heartbeat_timeout'];
      expect(timeoutListeners?.[0]).not.toHaveBeenCalled();
    });
  });

  describe('Event Listener Management', () => {
    it('should add and remove event listeners', () => {
      const testListener = vi.fn();

      connectionManager.on('test_event', testListener);
      expect(connectionManager.on).toHaveBeenCalledWith('test_event', testListener);

      connectionManager.off('test_event', testListener);
      expect(eventListeners['test_event']).not.toContain(testListener);
    });

    it('should remove all listeners for an event', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      connectionManager.on('test_event', listener1);
      connectionManager.on('test_event', listener2);

      connectionManager.off('test_event');

      expect(eventListeners['test_event']).toBeUndefined();
    });

    it('should handle listener errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const faultyListener = vi.fn(() => {
        throw new Error('Listener error');
      });

      connectionManager.on('test_event', faultyListener);

      // Simulate event emission
      (connectionManager as any).emit('test_event', { data: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SSEConnectionManager] Event listener error for test_event:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Resource Cleanup', () => {
    it('should cleanup resources on destroy', async () => {
      await connectionManager.connect();

      const mockEventSource = (global.EventSource as any).mock.instances[0];
      const closeSpy = vi.spyOn(mockEventSource, 'close');

      connectionManager.destroy();

      expect(closeSpy).toHaveBeenCalled();
      expect(connectionManager.getConnectionStatus().state).toBe(ConnectionState.DISCONNECTED);
    });

    it('should clear timers on cleanup', async () => {
      vi.useFakeTimers();
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      await connectionManager.connect();
      connectionManager.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(clearIntervalSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('Connection Status', () => {
    it('should provide accurate connection status', () => {
      const status = connectionManager.getConnectionStatus();

      expect(status).toMatchObject({
        state: ConnectionState.DISCONNECTED,
        instanceId: null,
        connectionType: 'none',
        lastActivity: null,
        reconnectAttempts: 0,
        error: null
      });
    });

    it('should update status during connection lifecycle', async () => {
      // Initial state
      expect(connectionManager.getConnectionStatus().state).toBe(ConnectionState.DISCONNECTED);

      // Connecting state
      const connectPromise = connectionManager.connect();
      expect(connectionManager.getConnectionStatus().state).toBe(ConnectionState.CONNECTING);

      // Connected state
      await connectPromise;
      expect(connectionManager.getConnectionStatus().state).toBe(ConnectionState.CONNECTED);

      // Disconnected state
      connectionManager.disconnect();
      expect(connectionManager.getConnectionStatus().state).toBe(ConnectionState.DISCONNECTED);
    });
  });
});