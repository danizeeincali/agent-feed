/**
 * ClaudeInstanceManager Test Suite - London School TDD Implementation
 * 
 * Comprehensive test suite for ClaudeInstanceManager focusing on WebSocket
 * interaction patterns and real-time communication testing.
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { ClaudeInstanceManager, ClaudeInstanceConfig, InstanceOutputMessage } from '../../src/managers/ClaudeInstanceManager';
import { SingleConnectionManager, ConnectionState } from '../../src/services/SingleConnectionManager';

// Mock SingleConnectionManager
vi.mock('../../src/services/SingleConnectionManager');

// Mock fetch
global.fetch = vi.fn();

describe('ClaudeInstanceManager - WebSocket Interaction TDD', () => {
  let instanceManager: ClaudeInstanceManager;
  let mockConnectionManager: Mock;
  let mockFetch: Mock;
  
  const testConfig: ClaudeInstanceConfig = {
    instanceId: 'test-instance-123',
    apiUrl: 'http://localhost:3333',
    websocketUrl: 'ws://localhost:3333/ws/claude/test-instance-123',
    autoConnect: false,
    reconnectAttempts: 3,
    reconnectInterval: 1000
  };

  beforeEach(() => {
    mockConnectionManager = vi.mocked(SingleConnectionManager.getInstance());
    mockFetch = vi.mocked(fetch);
    
    // Setup connection manager mocks
    mockConnectionManager.connect = vi.fn();
    mockConnectionManager.disconnect = vi.fn();
    mockConnectionManager.getCurrentConnection = vi.fn();
    mockConnectionManager.sendData = vi.fn();
    mockConnectionManager.addStateChangeListener = vi.fn();

    instanceManager = new ClaudeInstanceManager(testConfig);
  });

  afterEach(() => {
    instanceManager.cleanup();
    vi.clearAllMocks();
  });

  describe('Instance Connection Management', () => {
    it('should validate instance before connecting', async () => {
      // Arrange
      const instanceValidation = {
        success: true,
        instance: { id: 'test-instance-123', status: 'running' }
      };
      
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(instanceValidation)
      } as Response);

      mockConnectionManager.connect.mockResolvedValueOnce(undefined);

      // Act
      await instanceManager.connectToInstance('test-instance-123');

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v1/claude/instances/test-instance-123'
      );
      expect(mockConnectionManager.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'ws://localhost:3333/ws/claude/test-instance-123',
          instanceId: 'test-instance-123'
        })
      );
    });

    it('should reject connection to non-running instance', async () => {
      // Arrange
      const instanceValidation = {
        success: true,
        instance: { id: 'test-instance-123', status: 'stopped' }
      };
      
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(instanceValidation)
      } as Response);

      // Act & Assert
      await expect(instanceManager.connectToInstance('test-instance-123')).rejects.toThrow(
        'Instance test-instance-123 is not running or does not exist'
      );
      expect(mockConnectionManager.connect).not.toHaveBeenCalled();
    });

    it('should handle connection failures gracefully', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, instance: { status: 'running' } })
      } as Response);

      mockConnectionManager.connect.mockRejectedValueOnce(new Error('Connection failed'));

      // Act & Assert
      await expect(instanceManager.connectToInstance('test-instance-123')).rejects.toThrow(
        'Failed to connect to instance test-instance-123'
      );
    });
  });

  describe('Command Execution', () => {
    beforeEach(async () => {
      // Setup connected state
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, instance: { status: 'running' } })
      } as Response);
      mockConnectionManager.connect.mockResolvedValueOnce(undefined);
      mockConnectionManager.getCurrentConnection.mockReturnValue({
        state: ConnectionState.CONNECTED,
        instanceId: 'test-instance-123'
      });
      
      await instanceManager.connectToInstance('test-instance-123');
    });

    it('should send commands to connected instance', async () => {
      // Arrange
      mockConnectionManager.sendData.mockReturnValueOnce(true);

      // Act
      await instanceManager.sendCommand('ls -la');

      // Assert
      expect(mockConnectionManager.sendData).toHaveBeenCalledWith(
        {
          type: 'terminal:input',
          data: {
            input: 'ls -la\n',
            instanceId: 'test-instance-123'
          }
        },
        'test-instance-123'
      );
    });

    it('should reject commands when not connected', async () => {
      // Arrange
      instanceManager['currentInstanceId'] = null;

      // Act & Assert
      await expect(instanceManager.sendCommand('ls -la')).rejects.toThrow(
        'No instance connected'
      );
    });

    it('should handle command send failures', async () => {
      // Arrange
      mockConnectionManager.sendData.mockReturnValueOnce(false);

      // Act & Assert
      await expect(instanceManager.sendCommand('ls -la')).rejects.toThrow(
        'Failed to send command'
      );
    });
  });

  describe('Output Buffer Management', () => {
    it('should add messages to output buffer', () => {
      // Arrange
      const message: InstanceOutputMessage = {
        id: 'msg-1',
        instanceId: 'test-instance-123',
        type: 'output',
        content: 'Hello World\n',
        timestamp: new Date(),
        isReal: true
      };

      // Act
      instanceManager['addToOutputBuffer']('test-instance-123', message);

      // Assert
      const output = instanceManager.getInstanceOutput('test-instance-123');
      expect(output).toHaveLength(1);
      expect(output[0]).toEqual(message);
    });

    it('should limit output buffer size to prevent memory issues', () => {
      // Arrange & Act
      const instanceId = 'test-instance-123';
      
      // Add 1500 messages (exceeds 1000 limit)
      for (let i = 0; i < 1500; i++) {
        instanceManager['addToOutputBuffer'](instanceId, {
          id: `msg-${i}`,
          instanceId,
          type: 'output',
          content: `Message ${i}\n`,
          timestamp: new Date(),
          isReal: true
        });
      }

      // Assert
      const output = instanceManager.getInstanceOutput(instanceId);
      expect(output).toHaveLength(1000);
      expect(output[0].id).toBe('msg-500'); // First 500 messages removed
    });

    it('should clear output buffer for specific instance', () => {
      // Arrange
      instanceManager['addToOutputBuffer']('test-instance-123', {
        id: 'msg-1',
        instanceId: 'test-instance-123',
        type: 'output',
        content: 'Test message',
        timestamp: new Date()
      });

      // Act
      instanceManager.clearInstanceOutput('test-instance-123');

      // Assert
      const output = instanceManager.getInstanceOutput('test-instance-123');
      expect(output).toHaveLength(0);
    });
  });

  describe('Connection Status Monitoring', () => {
    it('should return correct connection status', () => {
      // Arrange
      mockConnectionManager.getCurrentConnection.mockReturnValue({
        state: ConnectionState.CONNECTED,
        instanceId: 'test-instance-123'
      });
      
      instanceManager['currentInstanceId'] = 'test-instance-123';
      instanceManager['connectionStats'] = {
        instanceId: 'test-instance-123',
        state: ConnectionState.CONNECTED,
        lastActivity: new Date(),
        messageCount: 5,
        reconnectAttempts: 0
      };

      // Act
      const status = instanceManager.getConnectionStatus();

      // Assert
      expect(status.isConnected).toBe(true);
      expect(status.instanceId).toBe('test-instance-123');
      expect(status.state).toBe(ConnectionState.CONNECTED);
      expect(status.connectionStats?.messageCount).toBe(5);
    });

    it('should handle disconnected state', () => {
      // Arrange
      mockConnectionManager.getCurrentConnection.mockReturnValue(null);
      instanceManager['currentInstanceId'] = null;

      // Act
      const status = instanceManager.getConnectionStatus();

      // Assert
      expect(status.isConnected).toBe(false);
      expect(status.instanceId).toBe(null);
      expect(status.state).toBe(ConnectionState.DISCONNECTED);
    });
  });

  describe('Event System', () => {
    it('should emit and handle instance connection events', () => {
      // Arrange
      const mockListener = vi.fn();
      instanceManager.on('instance:connected', mockListener);

      // Act
      instanceManager['emit']('instance:connected', { instanceId: 'test-123' });

      // Assert
      expect(mockListener).toHaveBeenCalledWith({ instanceId: 'test-123' });
    });

    it('should handle message processing events', () => {
      // Arrange
      const mockListener = vi.fn();
      instanceManager.on('instance:output', mockListener);
      
      instanceManager['currentInstanceId'] = 'test-instance-123';

      // Act
      instanceManager['handleMessage']({
        type: 'terminal:output',
        data: 'Test output',
        instanceId: 'test-instance-123',
        isReal: true
      });

      // Assert
      expect(mockListener).toHaveBeenCalledWith({
        instanceId: 'test-instance-123',
        content: 'Test output',
        isReal: true
      });
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection on connection error', async () => {
      // Arrange
      instanceManager['config'].reconnectAttempts = 2;
      instanceManager['connectionStats'] = {
        instanceId: 'test-instance-123',
        state: ConnectionState.ERROR,
        lastActivity: new Date(),
        messageCount: 0,
        reconnectAttempts: 0
      };

      const connectSpy = vi.spyOn(instanceManager, 'connectToInstance').mockResolvedValue();

      // Act
      instanceManager['handleReconnection']('test-instance-123');

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Assert
      expect(instanceManager['connectionStats']?.reconnectAttempts).toBe(1);
      expect(connectSpy).toHaveBeenCalledWith('test-instance-123');
    });

    it('should stop reconnection after max attempts', () => {
      // Arrange
      instanceManager['config'].reconnectAttempts = 2;
      instanceManager['connectionStats'] = {
        instanceId: 'test-instance-123',
        state: ConnectionState.ERROR,
        lastActivity: new Date(),
        messageCount: 0,
        reconnectAttempts: 2 // Already at max
      };

      const connectSpy = vi.spyOn(instanceManager, 'connectToInstance');

      // Act
      instanceManager['handleReconnection']('test-instance-123');

      // Assert
      expect(connectSpy).not.toHaveBeenCalled();
    });
  });
});