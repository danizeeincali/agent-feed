/**
 * TDD London School Tests for SSEClaudeInstanceManager
 * 
 * Behavior verification focusing on EventSource, fetch API interactions,
 * and event emission contracts for Claude instance synchronization.
 */

import { SSEClaudeInstanceManager, ConnectionState, SSEClaudeInstanceConfig } from '../../managers/ClaudeInstanceManager';

// Mock global EventSource
const mockEventSource = {
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  onopen: null as ((event: Event) => void) | null,
  onmessage: null as ((event: MessageEvent) => void) | null,
  onerror: null as ((event: Event) => void) => null,
  readyState: 0,
  url: '',
  withCredentials: false,
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2
};

global.EventSource = jest.fn().mockImplementation(() => mockEventSource);

// Mock fetch
global.fetch = jest.fn();

describe('SSEClaudeInstanceManager - London School TDD', () => {
  let manager: SSEClaudeInstanceManager;
  let config: SSEClaudeInstanceConfig;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let MockedEventSource: jest.MockedClass<typeof EventSource>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    config = {
      apiUrl: 'http://localhost:3000',
      reconnectAttempts: 3,
      reconnectInterval: 1000,
      maxBackoffDelay: 5000
    };

    manager = new SSEClaudeInstanceManager(config);
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    MockedEventSource = EventSource as jest.MockedClass<typeof EventSource>;
  });

  afterEach(() => {
    manager.cleanup();
    jest.useRealTimers();
  });

  describe('Instance Validation Behavior Contract', () => {
    it('should validate instance ID format before connection attempts', async () => {
      const invalidInstanceId = 'invalid-format';

      await expect(manager.connectToInstance(invalidInstanceId))
        .rejects.toThrow(`Invalid instance ID format: ${invalidInstanceId}`);

      expect(MockedEventSource).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should coordinate instance existence validation through API', async () => {
      const instanceId = 'claude-valid123';
      
      // Mock instance validation response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: instanceId, status: 'running' }
        })
      } as Response);

      await manager.connectToInstance(instanceId);

      expect(mockFetch).toHaveBeenCalledWith(
        `${config.apiUrl}/api/v1/claude/instances/${instanceId}`
      );
      expect(MockedEventSource).toHaveBeenCalledWith(
        `${config.apiUrl}/api/claude/instances/${instanceId}/terminal/stream`,
        { withCredentials: false }
      );
    });

    it('should reject connection to non-running instances', async () => {
      const instanceId = 'claude-stopped123';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: instanceId, status: 'stopped' }
        })
      } as Response);

      await expect(manager.connectToInstance(instanceId))
        .rejects.toThrow(`Instance ${instanceId} is not running or does not exist`);

      expect(MockedEventSource).not.toHaveBeenCalled();
    });

    it('should reject connection to non-existent instances', async () => {
      const instanceId = 'claude-nonexistent123';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Instance not found'
        })
      } as Response);

      await expect(manager.connectToInstance(instanceId))
        .rejects.toThrow(`Instance ${instanceId} is not running or does not exist`);
    });
  });

  describe('EventSource Connection Behavior Contract', () => {
    it('should establish EventSource connection with correct configuration', async () => {
      const instanceId = 'claude-test123';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: instanceId, status: 'running' }
        })
      } as Response);

      await manager.connectToInstance(instanceId);

      expect(MockedEventSource).toHaveBeenCalledWith(
        `${config.apiUrl}/api/claude/instances/${instanceId}/terminal/stream`,
        { withCredentials: false }
      );
      
      // Verify event handlers are set
      expect(mockEventSource.onopen).toBeDefined();
      expect(mockEventSource.onmessage).toBeDefined();
      expect(mockEventSource.onerror).toBeDefined();
    });

    it('should emit connection events when EventSource opens', async () => {
      const instanceId = 'claude-test123';
      const connectionSpy = jest.fn();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: instanceId, status: 'running' }
        })
      } as Response);

      manager.on('instance:connected', connectionSpy);
      
      await manager.connectToInstance(instanceId);
      
      // Simulate EventSource open event
      mockEventSource.onopen!(new Event('open'));

      expect(connectionSpy).toHaveBeenCalledWith({ instanceId });
      
      const status = manager.getConnectionStatus(instanceId);
      expect(status.state).toBe(ConnectionState.CONNECTED);
      expect(status.isConnected).toBe(true);
    });

    it('should handle EventSource errors with reconnection contract', async () => {
      const instanceId = 'claude-test123';
      const errorSpy = jest.fn();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: instanceId, status: 'running' }
        })
      } as Response);

      manager.on('instance:error', errorSpy);
      
      await manager.connectToInstance(instanceId);
      
      // Simulate EventSource error
      mockEventSource.onerror!(new Event('error'));

      expect(errorSpy).toHaveBeenCalledWith({
        instanceId,
        error: 'SSE connection error'
      });
      
      const status = manager.getConnectionStatus(instanceId);
      expect(status.state).toBe(ConnectionState.ERROR);
    });

    it('should coordinate reconnection attempts with exponential backoff', async () => {
      const instanceId = 'claude-test123';
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: instanceId, status: 'running' }
        })
      } as Response);

      await manager.connectToInstance(instanceId);
      
      // Simulate first connection error
      mockEventSource.onerror!(new Event('error'));
      
      const status1 = manager.getConnectionStatus(instanceId);
      expect(status1.state).toBe(ConnectionState.ERROR);

      // Fast-forward past reconnection delay
      jest.advanceTimersByTime(2000);

      // Should have attempted reconnection
      expect(MockedEventSource).toHaveBeenCalledTimes(2); // Original + reconnection attempt
    });

    it('should stop reconnection after max attempts reached', async () => {
      const instanceId = 'claude-test123';
      const maxReconnectSpy = jest.fn();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: instanceId, status: 'running' }
        })
      } as Response);

      manager.on('instance:max_reconnects_reached', maxReconnectSpy);
      
      await manager.connectToInstance(instanceId);

      // Simulate multiple connection errors (beyond max attempts)
      for (let i = 0; i < config.reconnectAttempts! + 1; i++) {
        mockEventSource.onerror!(new Event('error'));
        jest.advanceTimersByTime(5000); // Advance past backoff delay
      }

      expect(maxReconnectSpy).toHaveBeenCalledWith({ instanceId });
    });
  });

  describe('Message Processing Behavior Contract', () => {
    it('should coordinate terminal output message routing', async () => {
      const instanceId = 'claude-test123';
      const outputSpy = jest.fn();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: instanceId, status: 'running' }
        })
      } as Response);

      manager.on('instance:output', outputSpy);
      
      await manager.connectToInstance(instanceId);

      const mockMessage = {
        data: JSON.stringify({
          type: 'output',
          data: 'Hello from terminal',
          instanceId,
          timestamp: '2023-01-01T00:00:00Z',
          isReal: true
        })
      };

      // Simulate message received
      mockEventSource.onmessage!(mockMessage as MessageEvent);

      expect(outputSpy).toHaveBeenCalledWith({
        instanceId,
        content: 'Hello from terminal',
        isReal: true,
        timestamp: '2023-01-01T00:00:00Z'
      });
    });

    it('should buffer output messages per instance', async () => {
      const instanceId = 'claude-test123';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: instanceId, status: 'running' }
        })
      } as Response);

      await manager.connectToInstance(instanceId);

      const mockMessage = {
        data: JSON.stringify({
          type: 'output',
          data: 'Buffered output',
          instanceId,
          isReal: true
        })
      };

      mockEventSource.onmessage!(mockMessage as MessageEvent);

      const output = manager.getInstanceOutput(instanceId);
      expect(output).toHaveLength(1);
      expect(output[0]).toMatchObject({
        instanceId,
        type: 'output',
        content: 'Buffered output',
        isReal: true
      });
    });

    it('should filter non-real messages from output buffer', async () => {
      const instanceId = 'claude-test123';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: instanceId, status: 'running' }
        })
      } as Response);

      await manager.connectToInstance(instanceId);

      const mockMessage = {
        data: JSON.stringify({
          type: 'output',
          data: 'Fake output',
          instanceId,
          isReal: false // Should be filtered out
        })
      };

      mockEventSource.onmessage!(mockMessage as MessageEvent);

      const output = manager.getInstanceOutput(instanceId);
      expect(output).toHaveLength(0); // Should not be added to buffer
    });

    it('should handle malformed messages gracefully', async () => {
      const instanceId = 'claude-test123';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: instanceId, status: 'running' }
        })
      } as Response);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await manager.connectToInstance(instanceId);

      const invalidMessage = {
        data: 'invalid json'
      };

      // Should not throw, just log error
      expect(() => {
        mockEventSource.onmessage!(invalidMessage as MessageEvent);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('SSE message parse error'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Command Sending Behavior Contract', () => {
    it('should coordinate command sending through HTTP POST', async () => {
      const instanceId = 'claude-test123';
      const command = 'ls -la';
      
      // Setup connection
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: instanceId, status: 'running' }
        })
      } as Response);

      await manager.connectToInstance(instanceId);
      mockEventSource.onopen!(new Event('open')); // Simulate connected state

      // Mock command response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Command sent'
        })
      } as Response);

      const result = await manager.sendCommand(instanceId, command);

      expect(mockFetch).toHaveBeenCalledWith(
        `${config.apiUrl}/api/claude/instances/${instanceId}/terminal/input`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: command + '\n' }),
          signal: expect.any(AbortSignal)
        }
      );

      expect(result).toEqual({
        success: true,
        instanceId,
        message: 'Command sent'
      });
    });

    it('should add input to output buffer immediately', async () => {
      const instanceId = 'claude-test123';
      const command = 'test command';
      
      // Setup connection
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            instance: { id: instanceId, status: 'running' }
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        } as Response);

      await manager.connectToInstance(instanceId);
      mockEventSource.onopen!(new Event('open'));

      await manager.sendCommand(instanceId, command);

      const output = manager.getInstanceOutput(instanceId);
      expect(output).toHaveLength(1);
      expect(output[0]).toMatchObject({
        instanceId,
        type: 'input',
        content: `> ${command}\n`,
        isReal: true
      });
    });

    it('should reject commands when not connected', async () => {
      const instanceId = 'claude-test123';
      
      await expect(manager.sendCommand(instanceId, 'test'))
        .rejects.toThrow(`Not connected to instance ${instanceId}`);

      expect(mockFetch).toHaveBeenCalledTimes(0);
    });

    it('should handle HTTP errors in command sending', async () => {
      const instanceId = 'claude-test123';
      
      // Setup connection
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: instanceId, status: 'running' }
        })
      } as Response);

      await manager.connectToInstance(instanceId);
      mockEventSource.onopen!(new Event('open'));

      // Mock HTTP error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      const result = await manager.sendCommand(instanceId, 'test');

      expect(result).toEqual({
        success: false,
        instanceId,
        error: 'HTTP 500: Internal Server Error'
      });
    });
  });

  describe('Instance Discovery Behavior Contract', () => {
    it('should coordinate instance list fetching through API', async () => {
      const mockInstances = [
        { id: 'claude-instance1', status: 'running' },
        { id: 'claude-instance2', status: 'starting' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instances: mockInstances
        })
      } as Response);

      const instances = await manager.getAvailableInstances();

      expect(mockFetch).toHaveBeenCalledWith(
        `${config.apiUrl}/api/claude/instances`,
        { signal: expect.any(AbortSignal) }
      );

      expect(instances).toEqual(['claude-instance1', 'claude-instance2']);
    });

    it('should handle instance discovery API failures gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const instances = await manager.getAvailableInstances();

      expect(instances).toEqual([]); // Should return empty array on failure
    });

    it('should handle malformed instance list response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Database error'
        })
      } as Response);

      const instances = await manager.getAvailableInstances();

      expect(instances).toEqual([]); // Should return empty array on API failure
    });
  });

  describe('Disconnection Behavior Contract', () => {
    it('should coordinate clean disconnection with resource cleanup', async () => {
      const instanceId = 'claude-test123';
      const disconnectSpy = jest.fn();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: instanceId, status: 'running' }
        })
      } as Response);

      manager.on('instance:disconnected', disconnectSpy);
      
      await manager.connectToInstance(instanceId);
      await manager.disconnectFromInstance(instanceId);

      expect(mockEventSource.close).toHaveBeenCalled();
      expect(disconnectSpy).toHaveBeenCalledWith({ instanceId });
      
      const status = manager.getConnectionStatus(instanceId);
      expect(status.state).toBe(ConnectionState.DISCONNECTED);
    });

    it('should handle disconnection from multiple instances', async () => {
      const instance1 = 'claude-test1';
      const instance2 = 'claude-test2';
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          instance: { status: 'running' }
        })
      } as Response);

      await manager.connectToInstance(instance1);
      await manager.connectToInstance(instance2);

      await manager.disconnectFromInstance(); // Disconnect all

      expect(mockEventSource.close).toHaveBeenCalledTimes(4); // 2 connections + 2 disconnections
    });
  });

  describe('Output Buffer Management Contract', () => {
    it('should maintain output buffer size limits', async () => {
      const instanceId = 'claude-test123';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: instanceId, status: 'running' }
        })
      } as Response);

      await manager.connectToInstance(instanceId);

      // Simulate many messages to test buffer limit (1000 messages max)
      for (let i = 0; i < 1100; i++) {
        const mockMessage = {
          data: JSON.stringify({
            type: 'output',
            data: `Message ${i}`,
            instanceId,
            isReal: true
          })
        };
        mockEventSource.onmessage!(mockMessage as MessageEvent);
      }

      const output = manager.getInstanceOutput(instanceId);
      expect(output).toHaveLength(1000); // Should be capped at 1000
      expect(output[0].content).toBe('Message 100'); // First 100 should be removed
      expect(output[999].content).toBe('Message 1099'); // Last message should be preserved
    });

    it('should coordinate output clearing per instance', async () => {
      const instanceId = 'claude-test123';
      const clearSpy = jest.fn();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: instanceId, status: 'running' }
        })
      } as Response);

      manager.on('output:cleared', clearSpy);
      
      await manager.connectToInstance(instanceId);

      // Add some output
      const mockMessage = {
        data: JSON.stringify({
          type: 'output',
          data: 'Test output',
          instanceId,
          isReal: true
        })
      };
      mockEventSource.onmessage!(mockMessage as MessageEvent);

      expect(manager.getInstanceOutput(instanceId)).toHaveLength(1);

      manager.clearInstanceOutput(instanceId);

      expect(manager.getInstanceOutput(instanceId)).toHaveLength(0);
      expect(clearSpy).toHaveBeenCalledWith({ instanceId });
    });
  });

  describe('Resource Cleanup Contract', () => {
    it('should coordinate complete cleanup on manager destruction', () => {
      const cleanupSpy = jest.spyOn(manager, 'cleanup');

      manager.cleanup();

      expect(mockEventSource.close).toHaveBeenCalled();
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should abort pending requests on cleanup', () => {
      const abortSpy = jest.spyOn(AbortController.prototype, 'abort');

      manager.cleanup();

      expect(abortSpy).toHaveBeenCalled();
    });
  });

  describe('Health Status Monitoring Contract', () => {
    it('should provide accurate health status metrics', async () => {
      const instance1 = 'claude-test1';
      const instance2 = 'claude-test2';
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          instance: { status: 'running' }
        })
      } as Response);

      // Connect to instances
      await manager.connectToInstance(instance1);
      await manager.connectToInstance(instance2);
      
      // Simulate different connection states
      mockEventSource.onopen!(new Event('open')); // instance2 connected
      
      const health = manager.getHealthStatus();
      
      expect(health.totalConnections).toBe(1); // Only one connection (instance2 overwrote instance1)
      expect(health.activeConnections).toBe(1); // One connected
      expect(health.errorConnections).toBe(0);
      expect(health.reconnectingConnections).toBe(0);
    });
  });
});