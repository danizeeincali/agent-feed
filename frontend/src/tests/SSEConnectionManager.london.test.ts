/**
 * TDD London School Tests for SSEConnectionManager
 * 
 * Mock-driven connection contract testing focusing on EventSource behavior,
 * HTTP communication, and error recovery patterns.
 */

import { SSEConnectionManager, ConnectionState, ConnectionConfig } from '../../services/SSEConnectionManager';

// Mock global EventSource
const mockEventSource = {
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  onopen: null as ((event: Event) => void) | null,
  onmessage: null as ((event: MessageEvent) => void) | null,
  onerror: null as ((event: Event) => void) | null,
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

// Mock timers
jest.useFakeTimers();

describe('SSEConnectionManager - London School TDD', () => {
  let manager: SSEConnectionManager;
  let config: ConnectionConfig;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let MockedEventSource: jest.MockedClass<typeof EventSource>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    config = {
      instanceId: 'claude-test123',
      baseUrl: 'http://localhost:3000',
      maxReconnectAttempts: 3,
      reconnectDelay: 1000,
      maxBackoffDelay: 5000,
      heartbeatTimeout: 30000
    };

    manager = new SSEConnectionManager(config);
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    MockedEventSource = EventSource as jest.MockedClass<typeof EventSource>;
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('Connection Establishment Contract', () => {
    it('should validate instance ID format before attempting connection', async () => {
      const invalidManager = new SSEConnectionManager({
        ...config,
        instanceId: 'invalid-format'
      });

      await expect(invalidManager.connect())
        .rejects.toThrow('Invalid instance ID format: invalid-format');

      expect(mockFetch).not.toHaveBeenCalled();
      expect(MockedEventSource).not.toHaveBeenCalled();
    });

    it('should coordinate instance validation through API before connection', async () => {
      const instanceValidationResponse = {
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: config.instanceId, status: 'running' }
        })
      };

      mockFetch.mockResolvedValueOnce(instanceValidationResponse as Response);

      await manager.connect();

      expect(mockFetch).toHaveBeenCalledWith(
        `${config.baseUrl}/api/v1/claude/instances/${config.instanceId}`
      );
      expect(MockedEventSource).toHaveBeenCalledWith(
        `${config.baseUrl}/api/v1/claude/instances/${config.instanceId}/terminal/stream`,
        { withCredentials: false }
      );
    });

    it('should reject connection to non-running instances', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: config.instanceId, status: 'stopped' }
        })
      } as Response);

      await expect(manager.connect())
        .rejects.toThrow(`Instance ${config.instanceId} is not running or does not exist`);

      expect(MockedEventSource).not.toHaveBeenCalled();
    });

    it('should coordinate EventSource setup with proper event handlers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: config.instanceId, status: 'running' }
        })
      } as Response);

      await manager.connect();

      expect(mockEventSource.onopen).toBeDefined();
      expect(mockEventSource.onmessage).toBeDefined();
      expect(mockEventSource.onerror).toBeDefined();

      const status = manager.getConnectionStatus();
      expect(status.state).toBe(ConnectionState.CONNECTING);
    });

    it('should clean up existing connection before creating new one', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: config.instanceId, status: 'running' }
        })
      } as Response);

      // First connection
      await manager.connect();
      const firstEventSource = mockEventSource;

      // Second connection should cleanup first
      await manager.connect();

      expect(firstEventSource.close).toHaveBeenCalled();
      expect(MockedEventSource).toHaveBeenCalledTimes(2);
    });
  });

  describe('EventSource Event Handling Contract', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: config.instanceId, status: 'running' }
        })
      } as Response);

      await manager.connect();
    });

    it('should coordinate connection established events', () => {
      const connectSpy = jest.fn();
      manager.on('connect', connectSpy);

      // Simulate EventSource open event
      mockEventSource.onopen!(new Event('open'));

      expect(connectSpy).toHaveBeenCalledWith({
        instanceId: config.instanceId,
        connectionType: 'sse'
      });

      const status = manager.getConnectionStatus();
      expect(status.state).toBe(ConnectionState.CONNECTED);
      expect(status.reconnectAttempts).toBe(0);
    });

    it('should coordinate terminal output message processing', () => {
      const outputSpy = jest.fn();
      manager.on('terminal:output', outputSpy);

      const mockOutputMessage = {
        data: JSON.stringify({
          type: 'output',
          data: 'Hello from terminal',
          instanceId: config.instanceId,
          isReal: true,
          timestamp: '2023-01-01T00:00:00Z'
        })
      };

      mockEventSource.onmessage!(mockOutputMessage as MessageEvent);

      expect(outputSpy).toHaveBeenCalledWith({
        output: 'Hello from terminal',
        instanceId: config.instanceId,
        isReal: true,
        timestamp: '2023-01-01T00:00:00Z'
      });

      const status = manager.getConnectionStatus();
      expect(status.lastActivity).toBeInstanceOf(Date);
    });

    it('should coordinate alternative terminal output format', () => {
      const outputSpy = jest.fn();
      manager.on('terminal:output', outputSpy);

      const mockMessage = {
        data: JSON.stringify({
          type: 'terminal_output',
          output: 'Alternative format output',
          instanceId: config.instanceId,
          isReal: true,
          timestamp: '2023-01-01T00:00:00Z'
        })
      };

      mockEventSource.onmessage!(mockMessage as MessageEvent);

      expect(outputSpy).toHaveBeenCalledWith({
        output: 'Alternative format output',
        instanceId: config.instanceId,
        isReal: true,
        timestamp: '2023-01-01T00:00:00Z'
      });
    });

    it('should coordinate instance status updates', () => {
      const statusSpy = jest.fn();
      manager.on('instance:status', statusSpy);

      const mockStatusMessage = {
        data: JSON.stringify({
          type: 'instance:status',
          status: 'busy',
          instanceId: config.instanceId,
          timestamp: '2023-01-01T00:00:00Z'
        })
      };

      mockEventSource.onmessage!(mockStatusMessage as MessageEvent);

      expect(statusSpy).toHaveBeenCalledWith({
        instanceId: config.instanceId,
        status: 'busy',
        timestamp: '2023-01-01T00:00:00Z'
      });
    });

    it('should filter non-real output messages', () => {
      const outputSpy = jest.fn();
      manager.on('terminal:output', outputSpy);

      const mockFakeMessage = {
        data: JSON.stringify({
          type: 'output',
          data: 'Fake output',
          instanceId: config.instanceId,
          isReal: false // Should be filtered
        })
      };

      mockEventSource.onmessage!(mockFakeMessage as MessageEvent);

      expect(outputSpy).not.toHaveBeenCalled();
    });

    it('should handle heartbeat messages for connection health', () => {
      const heartbeatMessage = {
        data: JSON.stringify({
          type: 'heartbeat',
          timestamp: '2023-01-01T00:00:00Z'
        })
      };

      // Should not throw or emit specific events, just update activity
      expect(() => {
        mockEventSource.onmessage!(heartbeatMessage as MessageEvent);
      }).not.toThrow();

      const status = manager.getConnectionStatus();
      expect(status.lastActivity).toBeInstanceOf(Date);
    });

    it('should handle malformed messages gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const malformedMessage = {
        data: 'invalid json'
      };

      expect(() => {
        mockEventSource.onmessage!(malformedMessage as MessageEvent);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Message parsing error'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Command Sending Behavior Contract', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: config.instanceId, status: 'running' }
        })
      } as Response);

      await manager.connect();
      mockEventSource.onopen!(new Event('open')); // Set to connected state
    });

    it('should coordinate HTTP command sending with proper payload', async () => {
      const command = 'ls -la';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      await manager.sendCommand(command);

      expect(mockFetch).toHaveBeenCalledWith(
        `${config.baseUrl}/api/v1/claude/instances/${config.instanceId}/terminal/input`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: command + '\n' })
        }
      );
    });

    it('should reject commands when not connected', async () => {
      const disconnectedManager = new SSEConnectionManager(config);

      await expect(disconnectedManager.sendCommand('test'))
        .rejects.toThrow('Not connected to instance');

      expect(mockFetch).toHaveBeenCalledTimes(1); // Only the initial validation call
    });

    it('should reject empty commands', async () => {
      await expect(manager.sendCommand(''))
        .rejects.toThrow('Command cannot be empty');

      await expect(manager.sendCommand('   '))
        .rejects.toThrow('Command cannot be empty');
    });

    it('should handle HTTP errors in command sending', async () => {
      const errorSpy = jest.fn();
      manager.on('error', errorSpy);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      await expect(manager.sendCommand('test command'))
        .rejects.toThrow('HTTP 500: Internal Server Error');

      expect(errorSpy).toHaveBeenCalledWith({
        error: 'HTTP 500: Internal Server Error',
        type: 'command_send'
      });
    });

    it('should handle API response failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Command execution failed'
        })
      } as Response);

      await expect(manager.sendCommand('failing command'))
        .rejects.toThrow('Command execution failed');
    });

    it('should update last activity timestamp on successful command', async () => {
      const initialStatus = manager.getConnectionStatus();
      const initialActivity = initialStatus.lastActivity;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      await manager.sendCommand('successful command');

      const updatedStatus = manager.getConnectionStatus();
      expect(updatedStatus.lastActivity).not.toBe(initialActivity);
      expect(updatedStatus.lastActivity!.getTime()).toBeGreaterThan(
        initialActivity!.getTime()
      );
    });
  });

  describe('Reconnection Behavior Contract', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: config.instanceId, status: 'running' }
        })
      } as Response);

      await manager.connect();
    });

    it('should coordinate reconnection attempts with exponential backoff', () => {
      const errorSpy = jest.fn();
      manager.on('error', errorSpy);

      // Simulate connection error
      mockEventSource.onerror!(new Event('error'));

      expect(errorSpy).toHaveBeenCalledWith({
        error: 'SSE connection error',
        instanceId: config.instanceId,
        reconnectAttempts: 1
      });

      const status = manager.getConnectionStatus();
      expect(status.state).toBe(ConnectionState.RECONNECTING);
      expect(status.reconnectAttempts).toBe(1);

      // Fast-forward to trigger reconnection
      jest.advanceTimersByTime(1000);

      expect(MockedEventSource).toHaveBeenCalledTimes(2); // Original + reconnection
    });

    it('should implement exponential backoff with jitter', () => {
      // First reconnection attempt
      mockEventSource.onerror!(new Event('error'));
      let delay1 = jest.getTimerCount();
      jest.advanceTimersByTime(2000);

      // Second reconnection attempt
      mockEventSource.onerror!(new Event('error'));
      let delay2 = jest.getTimerCount();
      jest.advanceTimersByTime(3000);

      // Third reconnection attempt
      mockEventSource.onerror!(new Event('error'));
      
      // Should have increasing delays (base * 2^(attempt-1))
      // Base delay: 1000ms
      // Attempt 1: 1000ms (+ jitter)
      // Attempt 2: 2000ms (+ jitter)
      // Attempt 3: 4000ms (+ jitter), capped at maxBackoffDelay (5000ms)
      expect(MockedEventSource).toHaveBeenCalledTimes(4); // Original + 3 reconnections
    });

    it('should stop reconnection after max attempts reached', () => {
      const maxReconnectSpy = jest.fn();
      manager.on('max_reconnect_reached', maxReconnectSpy);

      // Exceed max reconnection attempts
      for (let i = 0; i < config.maxReconnectAttempts! + 1; i++) {
        mockEventSource.onerror!(new Event('error'));
        jest.advanceTimersByTime(6000); // Advance past max backoff delay
      }

      expect(maxReconnectSpy).toHaveBeenCalledWith({
        instanceId: config.instanceId,
        attempts: config.maxReconnectAttempts! + 1
      });

      const status = manager.getConnectionStatus();
      expect(status.state).toBe(ConnectionState.ERROR);
    });

    it('should reset reconnection count on successful connection', () => {
      // Cause an error and reconnection
      mockEventSource.onerror!(new Event('error'));
      jest.advanceTimersByTime(1000);

      // Simulate successful reconnection
      mockEventSource.onopen!(new Event('open'));

      const status = manager.getConnectionStatus();
      expect(status.reconnectAttempts).toBe(0); // Should be reset
      expect(status.state).toBe(ConnectionState.CONNECTED);
    });

    it('should handle connection errors during connecting state', () => {
      const connectingManager = new SSEConnectionManager(config);

      // Mock EventSource to be in CONNECTING state
      Object.defineProperty(mockEventSource, 'readyState', {
        value: EventSource.CONNECTING,
        writable: true
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockEventSource.onerror!(new Event('error'));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Connection in progress, waiting...')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Heartbeat Monitoring Contract', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: config.instanceId, status: 'running' }
        })
      } as Response);

      await manager.connect();
      mockEventSource.onopen!(new Event('open'));
    });

    it('should start heartbeat monitoring on connection', () => {
      // Heartbeat timer should be active
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });

    it('should detect heartbeat timeout and emit warning', () => {
      const timeoutSpy = jest.fn();
      manager.on('heartbeat_timeout', timeoutSpy);

      // Advance time beyond heartbeat timeout without receiving messages
      jest.advanceTimersByTime(config.heartbeatTimeout! + 1000);

      expect(timeoutSpy).toHaveBeenCalledWith({
        instanceId: config.instanceId,
        lastHeartbeat: expect.any(Date)
      });
    });

    it('should update heartbeat timestamp on message receipt', () => {
      const heartbeatMessage = {
        data: JSON.stringify({
          type: 'heartbeat'
        })
      };

      const initialTime = Date.now();
      
      // Advance time a bit
      jest.advanceTimersByTime(5000);
      
      // Receive heartbeat
      mockEventSource.onmessage!(heartbeatMessage as MessageEvent);
      
      // Advance more time but not beyond timeout
      jest.advanceTimersByTime(10000);

      const timeoutSpy = jest.fn();
      manager.on('heartbeat_timeout', timeoutSpy);

      // Should not timeout since we received a recent heartbeat
      expect(timeoutSpy).not.toHaveBeenCalled();
    });
  });

  describe('Disconnection and Cleanup Contract', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: config.instanceId, status: 'running' }
        })
      } as Response);

      await manager.connect();
    });

    it('should coordinate clean disconnection with resource cleanup', () => {
      const disconnectSpy = jest.fn();
      manager.on('disconnect', disconnectSpy);

      manager.disconnect();

      expect(mockEventSource.close).toHaveBeenCalled();
      expect(disconnectSpy).toHaveBeenCalledWith({
        instanceId: config.instanceId
      });

      const status = manager.getConnectionStatus();
      expect(status.state).toBe(ConnectionState.DISCONNECTED);
      expect(status.connectionType).toBe('none');
    });

    it('should clean up timers on disconnection', () => {
      const initialTimerCount = jest.getTimerCount();
      
      manager.disconnect();

      const finalTimerCount = jest.getTimerCount();
      expect(finalTimerCount).toBeLessThan(initialTimerCount);
    });

    it('should coordinate complete cleanup on destroy', () => {
      manager.destroy();

      expect(mockEventSource.close).toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);

      const status = manager.getConnectionStatus();
      expect(status.state).toBe(ConnectionState.DISCONNECTED);
    });
  });

  describe('State Change Event Coordination', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: config.instanceId, status: 'running' }
        })
      } as Response);
    });

    it('should emit state change events on connection state transitions', async () => {
      const stateChangeSpy = jest.fn();
      manager.on('state_change', stateChangeSpy);

      await manager.connect();
      
      // Should have emitted CONNECTING state
      expect(stateChangeSpy).toHaveBeenCalledWith({
        previousState: ConnectionState.DISCONNECTED,
        currentState: ConnectionState.CONNECTING,
        instanceId: config.instanceId
      });

      // Simulate connection established
      mockEventSource.onopen!(new Event('open'));

      expect(stateChangeSpy).toHaveBeenCalledWith({
        previousState: ConnectionState.CONNECTING,
        currentState: ConnectionState.CONNECTED,
        instanceId: config.instanceId
      });
    });

    it('should not emit duplicate state change events', async () => {
      const stateChangeSpy = jest.fn();
      manager.on('state_change', stateChangeSpy);

      await manager.connect();
      mockEventSource.onopen!(new Event('open'));

      const initialCallCount = stateChangeSpy.mock.calls.length;

      // Simulate another open event (shouldn't change state)
      mockEventSource.onopen!(new Event('open'));

      expect(stateChangeSpy).toHaveBeenCalledTimes(initialCallCount);
    });
  });

  describe('Connection Status Query Contract', () => {
    it('should provide accurate connection status information', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: config.instanceId, status: 'running' }
        })
      } as Response);

      const initialStatus = manager.getConnectionStatus();
      expect(initialStatus.state).toBe(ConnectionState.DISCONNECTED);
      expect(initialStatus.connectionType).toBe('none');
      expect(initialStatus.reconnectAttempts).toBe(0);

      await manager.connect();
      const connectingStatus = manager.getConnectionStatus();
      expect(connectingStatus.state).toBe(ConnectionState.CONNECTING);

      mockEventSource.onopen!(new Event('open'));
      const connectedStatus = manager.getConnectionStatus();
      expect(connectedStatus.state).toBe(ConnectionState.CONNECTED);
      expect(connectedStatus.connectionType).toBe('sse');
    });

    it('should track error states and messages correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: config.instanceId, status: 'running' }
        })
      } as Response);

      await manager.connect();
      mockEventSource.onerror!(new Event('error'));

      const errorStatus = manager.getConnectionStatus();
      expect(errorStatus.state).toBe(ConnectionState.ERROR);
      expect(errorStatus.error).toBe('SSE connection error');
      expect(errorStatus.reconnectAttempts).toBe(1);
    });
  });

  describe('Event Listener Management Contract', () => {
    it('should coordinate event listener registration and removal', () => {
      const testHandler = jest.fn();

      manager.on('test_event', testHandler);
      manager.emit('test_event', { data: 'test' });

      expect(testHandler).toHaveBeenCalledWith({ data: 'test' });

      manager.off('test_event', testHandler);
      manager.emit('test_event', { data: 'test2' });

      expect(testHandler).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should handle listener errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const faultyHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });

      manager.on('test_event', faultyHandler);
      
      expect(() => {
        manager.emit('test_event', { data: 'test' });
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Event listener error'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});