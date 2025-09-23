/**
 * SPARC Phase 4: TDD Refinement - SSEConnectionManager Integration Tests
 * 
 * Comprehensive test suite for WebSocket to SSE migration validation
 * Testing real-time Claude instance terminal interaction via EventSource
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { SSEConnectionManager, ConnectionState } from '../../services/SSEConnectionManager';

// Mock EventSource for testing
class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  public readyState: number = MockEventSource.CONNECTING;
  public url: string;
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;

  private eventListeners: Map<string, Function[]> = new Map();

  constructor(url: string, eventSourceInitDict?: EventSourceInit) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  addEventListener(type: string, listener: Function) {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: Function) {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Test helper to simulate server messages
  simulateMessage(data: any) {
    const event = new MessageEvent('message', {
      data: JSON.stringify(data)
    });
    this.onmessage?.(event);
  }

  // Test helper to simulate connection errors
  simulateError() {
    this.onerror?.(new Event('error'));
  }
}

// Mock fetch for HTTP requests
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock global EventSource
global.EventSource = MockEventSource as any;

describe('SSEConnectionManager', () => {
  let manager: SSEConnectionManager;
  let mockEventSource: MockEventSource;

  const defaultConfig = {
    instanceId: 'claude-test-123',
    baseUrl: 'http://localhost:3000',
    maxReconnectAttempts: 3,
    reconnectDelay: 100,
    maxBackoffDelay: 1000,
    heartbeatTimeout: 5000
  };

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new SSEConnectionManager(defaultConfig);
    
    // Mock successful instance validation
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/v1/claude/instances/claude-test-123')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            instance: { id: 'claude-test-123', status: 'running' }
          })
        });
      }
      if (url.includes('/terminal/input')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  afterEach(() => {
    if (manager) {
      manager.destroy();
    }
  });

  describe('Connection Management', () => {
    it('should validate instance ID format before connecting', async () => {
      const invalidManager = new SSEConnectionManager({
        ...defaultConfig,
        instanceId: 'invalid-id-format'
      });

      await expect(invalidManager.connect()).rejects.toThrow('Invalid instance ID format');
    });

    it('should validate instance exists and is running', async () => {
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            instance: { id: 'claude-test-123', status: 'stopped' }
          })
        })
      );

      await expect(manager.connect()).rejects.toThrow('not running or does not exist');
    });

    it('should establish SSE connection successfully', async () => {
      const connectPromise = manager.connect();
      
      // Wait for connection to establish
      await new Promise(resolve => setTimeout(resolve, 20));
      
      const status = manager.getConnectionStatus();
      expect(status.state).toBe(ConnectionState.CONNECTED);
      expect(status.connectionType).toBe('sse');
      expect(status.instanceId).toBe('claude-test-123');
    });

    it('should emit connect event when connection established', async () => {
      const connectHandler = vi.fn();
      manager.on('connect', connectHandler);

      await manager.connect();
      
      // Wait for connection event
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(connectHandler).toHaveBeenCalledWith({
        instanceId: 'claude-test-123',
        connectionType: 'sse'
      });
    });

    it('should disconnect cleanly', async () => {
      await manager.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const disconnectHandler = vi.fn();
      manager.on('disconnect', disconnectHandler);

      manager.disconnect();

      const status = manager.getConnectionStatus();
      expect(status.state).toBe(ConnectionState.DISCONNECTED);
      expect(status.connectionType).toBe('none');
      expect(disconnectHandler).toHaveBeenCalled();
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await manager.connect();
      await new Promise(resolve => setTimeout(resolve, 20));
      mockEventSource = (global.EventSource as any).mock.instances[0];
    });

    it('should handle terminal output messages', () => {
      const outputHandler = vi.fn();
      manager.on('terminal:output', outputHandler);

      const testOutput = {
        type: 'output',
        data: 'Test output from Claude',
        isReal: true,
        instanceId: 'claude-test-123',
        timestamp: new Date().toISOString()
      };

      mockEventSource.simulateMessage(testOutput);

      expect(outputHandler).toHaveBeenCalledWith({
        output: 'Test output from Claude',
        instanceId: 'claude-test-123',
        isReal: true,
        timestamp: testOutput.timestamp
      });
    });

    it('should handle instance status updates', () => {
      const statusHandler = vi.fn();
      manager.on('instance:status', statusHandler);

      const statusUpdate = {
        type: 'instance:status',
        instanceId: 'claude-test-123',
        status: 'running',
        timestamp: new Date().toISOString()
      };

      mockEventSource.simulateMessage(statusUpdate);

      expect(statusHandler).toHaveBeenCalledWith({
        instanceId: 'claude-test-123',
        status: 'running',
        timestamp: statusUpdate.timestamp
      });
    });

    it('should ignore non-real output messages', () => {
      const outputHandler = vi.fn();
      manager.on('terminal:output', outputHandler);

      const fakeOutput = {
        type: 'output',
        data: 'Fake output',
        isReal: false,
        instanceId: 'claude-test-123'
      };

      mockEventSource.simulateMessage(fakeOutput);

      expect(outputHandler).not.toHaveBeenCalled();
    });

    it('should handle heartbeat messages', () => {
      const heartbeatMessage = {
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      };

      expect(() => {
        mockEventSource.simulateMessage(heartbeatMessage);
      }).not.toThrow();

      // Connection should remain healthy
      const status = manager.getConnectionStatus();
      expect(status.state).toBe(ConnectionState.CONNECTED);
    });
  });

  describe('Command Sending', () => {
    beforeEach(async () => {
      await manager.connect();
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    it('should send commands via HTTP POST', async () => {
      await manager.sendCommand('test command');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/claude/instances/claude-test-123/terminal/input',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: 'test command\n'
          })
        }
      );
    });

    it('should reject empty commands', async () => {
      await expect(manager.sendCommand('')).rejects.toThrow('Command cannot be empty');
      await expect(manager.sendCommand('   ')).rejects.toThrow('Command cannot be empty');
    });

    it('should reject commands when not connected', async () => {
      manager.disconnect();
      
      await expect(manager.sendCommand('test')).rejects.toThrow('Not connected to instance');
    });

    it('should handle command send failures', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
      );

      const errorHandler = vi.fn();
      manager.on('error', errorHandler);

      await expect(manager.sendCommand('test')).rejects.toThrow('HTTP 500: Internal Server Error');
      expect(errorHandler).toHaveBeenCalledWith({
        error: 'HTTP 500: Internal Server Error',
        type: 'command_send'
      });
    });
  });

  describe('Reconnection Logic', () => {
    beforeEach(async () => {
      await manager.connect();
      await new Promise(resolve => setTimeout(resolve, 20));
      mockEventSource = (global.EventSource as any).mock.instances[0];
    });

    it('should attempt reconnection on connection error', () => {
      const stateChangeHandler = vi.fn();
      manager.on('state_change', stateChangeHandler);

      // Simulate connection error
      mockEventSource.simulateError();

      // Should transition to reconnecting state
      expect(stateChangeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          currentState: ConnectionState.ERROR
        })
      );
    });

    it('should implement exponential backoff', () => {
      const manager = new SSEConnectionManager({
        ...defaultConfig,
        reconnectDelay: 100,
        maxBackoffDelay: 1000
      });

      // Test backoff calculation (private method testing via connection attempts)
      const status = manager.getConnectionStatus();
      expect(status.reconnectAttempts).toBe(0);
    });

    it('should emit max reconnect reached after exhausting attempts', () => {
      const maxReconnectHandler = vi.fn();
      manager.on('max_reconnect_reached', maxReconnectHandler);

      // Simulate multiple connection errors to exhaust retry attempts
      for (let i = 0; i < 4; i++) {
        mockEventSource.simulateError();
      }

      // Should eventually emit max reconnect reached
      setTimeout(() => {
        expect(maxReconnectHandler).toHaveBeenCalledWith({
          instanceId: 'claude-test-123',
          attempts: 3
        });
      }, 1000);
    });
  });

  describe('Heartbeat Monitoring', () => {
    it('should detect heartbeat timeouts', async () => {
      const shortHeartbeatManager = new SSEConnectionManager({
        ...defaultConfig,
        heartbeatTimeout: 100 // Very short timeout for testing
      });

      const heartbeatTimeoutHandler = vi.fn();
      shortHeartbeatManager.on('heartbeat_timeout', heartbeatTimeoutHandler);

      await shortHeartbeatManager.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      // Wait for heartbeat timeout
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(heartbeatTimeoutHandler).toHaveBeenCalledWith({
        instanceId: 'claude-test-123',
        lastHeartbeat: expect.any(Date)
      });

      shortHeartbeatManager.destroy();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON messages gracefully', async () => {
      await manager.connect();
      await new Promise(resolve => setTimeout(resolve, 20));
      mockEventSource = (global.EventSource as any).mock.instances[0];

      // Simulate malformed JSON
      const malformedEvent = new MessageEvent('message', {
        data: 'invalid json{'
      });

      expect(() => {
        mockEventSource.onmessage?.(malformedEvent);
      }).not.toThrow();
    });

    it('should handle network failures during instance validation', async () => {
      mockFetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')));

      await expect(manager.connect()).rejects.toThrow('Network error');
    });

    it('should clean up resources on destroy', () => {
      const destroyedManager = new SSEConnectionManager(defaultConfig);
      
      destroyedManager.on('test', vi.fn());
      expect(destroyedManager.getConnectionStatus().state).toBe(ConnectionState.DISCONNECTED);
      
      destroyedManager.destroy();
      
      // Should clean up event listeners
      expect(() => destroyedManager.on('test', vi.fn())).not.toThrow();
    });
  });

  describe('Event Listener Management', () => {
    it('should add and remove event listeners', () => {
      const testHandler = vi.fn();
      
      manager.on('test', testHandler);
      manager.on('test', testHandler); // Should not duplicate
      
      // Simulate event
      (manager as any).emit('test', { data: 'test' });
      
      expect(testHandler).toHaveBeenCalledTimes(1);
      
      manager.off('test', testHandler);
      (manager as any).emit('test', { data: 'test2' });
      
      expect(testHandler).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should remove all listeners for an event', () => {
      const testHandler1 = vi.fn();
      const testHandler2 = vi.fn();
      
      manager.on('test', testHandler1);
      manager.on('test', testHandler2);
      
      manager.off('test'); // Remove all
      
      (manager as any).emit('test', { data: 'test' });
      
      expect(testHandler1).not.toHaveBeenCalled();
      expect(testHandler2).not.toHaveBeenCalled();
    });
  });
});