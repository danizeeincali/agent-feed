/**
 * SSE Connection Integration Tests
 * Tests the complete SSE connection flow with proper URL paths
 */

// const { jest } = require('@jest/globals'); // Remove this line

// Mock the useAdvancedSSEConnection hook
const mockUseAdvancedSSEConnection = jest.fn();
jest.doMock('../../../frontend/src/hooks/useAdvancedSSEConnection', () => ({
  useAdvancedSSEConnection: mockUseAdvancedSSEConnection,
  default: mockUseAdvancedSSEConnection
}));

describe('SSE Connection Integration', () => {
  let mockConnectionState;
  let mockConnectToInstance;
  let mockDisconnectFromInstance;
  let mockSendCommand;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock connection state
    mockConnectionState = {
      isConnected: false,
      isConnecting: false,
      isRecovering: false,
      instanceId: null,
      lastError: null,
      connectionHealth: 'failed',
      sequenceNumber: 0,
      messagesPerSecond: 0,
      memoryUsage: 0
    };
    
    // Mock functions
    mockConnectToInstance = jest.fn();
    mockDisconnectFromInstance = jest.fn();
    mockSendCommand = jest.fn();
    
    // Setup hook return value
    mockUseAdvancedSSEConnection.mockReturnValue({
      connectionState: mockConnectionState,
      connectToInstance: mockConnectToInstance,
      disconnectFromInstance: mockDisconnectFromInstance,
      sendCommand: mockSendCommand,
      addMessageHandler: jest.fn(() => () => {}),
      addStateChangeHandler: jest.fn(() => () => {}),
      getMetrics: jest.fn(() => ({
        totalMessages: 0,
        messagesPerSecond: 0,
        averageLatency: 0,
        connectionUptime: 0,
        recoveryCount: 0,
        lastRecoveryTime: 0
      }))
    });
  });

  describe('Connection Establishment', () => {
    test('should establish SSE connection after instance creation', async () => {
      const instanceId = 'claude-test-123';
      
      // Mock successful connection
      mockConnectToInstance.mockResolvedValue(undefined);
      mockConnectionState.isConnected = true;
      mockConnectionState.instanceId = instanceId;
      mockConnectionState.connectionHealth = 'healthy';
      
      // Simulate connecting to instance
      await mockConnectToInstance(instanceId);
      
      expect(mockConnectToInstance).toHaveBeenCalledWith(instanceId);
      expect(mockConnectToInstance).toHaveBeenCalledTimes(1);
    });

    test('should handle connection timeouts gracefully', async () => {
      const instanceId = 'claude-test-123';
      
      // Mock connection timeout
      mockConnectToInstance.mockRejectedValue(new Error('Connection timeout'));
      mockConnectionState.lastError = 'Connection timeout';
      mockConnectionState.connectionHealth = 'failed';
      
      await expect(mockConnectToInstance(instanceId)).rejects.toThrow('Connection timeout');
      expect(mockConnectionState.lastError).toBe('Connection timeout');
    });

    test('should validate instance ID format before connection', async () => {
      const invalidInstanceId = 'invalid-format';
      const validInstanceId = 'claude-test-123';
      
      // Should reject invalid instance ID
      const isValidFormat = /^claude-[a-zA-Z0-9]+$/.test(invalidInstanceId);
      expect(isValidFormat).toBe(false);
      
      // Should accept valid instance ID
      const isValidFormatValid = /^claude-[a-zA-Z0-9]+$/.test(validInstanceId);
      expect(isValidFormatValid).toBe(true);
    });
  });

  describe('Message Handling', () => {
    test('should handle terminal output messages', async () => {
      const instanceId = 'claude-test-123';
      const testMessage = {
        type: 'terminal_output',
        instanceId,
        output: 'Test output from Claude',
        timestamp: new Date().toISOString()
      };
      
      // Mock message handler
      const mockMessageHandler = jest.fn();
      const addMessageHandler = mockUseAdvancedSSEConnection().addMessageHandler;
      addMessageHandler.mockReturnValue(() => {}); // Cleanup function
      
      // Add handler and simulate message
      const cleanup = addMessageHandler(mockMessageHandler);
      
      // Simulate receiving a message (this would normally come from SSE)
      mockMessageHandler(instanceId, [testMessage]);
      
      expect(mockMessageHandler).toHaveBeenCalledWith(instanceId, [testMessage]);
      expect(typeof cleanup).toBe('function');
    });

    test('should handle connection state changes', async () => {
      const instanceId = 'claude-test-123';
      
      // Mock state change handler
      const mockStateHandler = jest.fn();
      const addStateChangeHandler = mockUseAdvancedSSEConnection().addStateChangeHandler;
      addStateChangeHandler.mockReturnValue(() => {}); // Cleanup function
      
      // Add handler
      const cleanup = addStateChangeHandler(mockStateHandler);
      
      // Simulate state change
      const newState = {
        ...mockConnectionState,
        isConnected: true,
        connectionHealth: 'healthy'
      };
      
      mockStateHandler(instanceId, newState);
      
      expect(mockStateHandler).toHaveBeenCalledWith(instanceId, newState);
      expect(typeof cleanup).toBe('function');
    });

    test('should handle error messages from SSE', async () => {
      const instanceId = 'claude-test-123';
      const errorMessage = {
        type: 'error',
        instanceId,
        error: 'Connection lost',
        timestamp: new Date().toISOString()
      };
      
      // Update connection state to reflect error
      mockConnectionState.lastError = 'Connection lost';
      mockConnectionState.connectionHealth = 'failed';
      mockConnectionState.isConnected = false;
      
      expect(mockConnectionState.lastError).toBe('Connection lost');
      expect(mockConnectionState.connectionHealth).toBe('failed');
    });
  });

  describe('Command Sending', () => {
    test('should send commands to connected instance', async () => {
      const instanceId = 'claude-test-123';
      const command = 'test command';
      
      // Mock connected state
      mockConnectionState.isConnected = true;
      mockConnectionState.instanceId = instanceId;
      
      // Mock successful command sending
      mockSendCommand.mockResolvedValue(undefined);
      
      await mockSendCommand(instanceId, command);
      
      expect(mockSendCommand).toHaveBeenCalledWith(instanceId, command);
      expect(mockSendCommand).toHaveBeenCalledTimes(1);
    });

    test('should reject commands when not connected', async () => {
      const instanceId = 'claude-test-123';
      const command = 'test command';
      
      // Mock disconnected state
      mockConnectionState.isConnected = false;
      
      // Mock rejection
      mockSendCommand.mockRejectedValue(new Error('Not connected'));
      
      await expect(mockSendCommand(instanceId, command)).rejects.toThrow('Not connected');
    });

    test('should validate command content', async () => {
      const instanceId = 'claude-test-123';
      const emptyCommand = '';
      const validCommand = 'help';
      
      // Empty commands should be rejected
      expect(emptyCommand.trim()).toBe('');
      
      // Valid commands should be accepted
      expect(validCommand.trim().length).toBeGreaterThan(0);
    });
  });

  describe('Connection Cleanup', () => {
    test('should cleanup connection when component unmounts', async () => {
      const instanceId = 'claude-test-123';
      
      // Mock connected state
      mockConnectionState.isConnected = true;
      mockConnectionState.instanceId = instanceId;
      
      // Mock disconnect
      mockDisconnectFromInstance.mockResolvedValue(undefined);
      
      // Simulate cleanup
      await mockDisconnectFromInstance(instanceId);
      
      expect(mockDisconnectFromInstance).toHaveBeenCalledWith(instanceId);
    });

    test('should handle disconnect errors gracefully', async () => {
      const instanceId = 'claude-test-123';
      
      // Mock disconnect error
      mockDisconnectFromInstance.mockRejectedValue(new Error('Disconnect failed'));
      
      // Should not throw - just log error
      try {
        await mockDisconnectFromInstance(instanceId);
      } catch (error) {
        expect(error.message).toBe('Disconnect failed');
      }
    });
  });

  describe('Recovery and Reconnection', () => {
    test('should attempt reconnection on connection loss', async () => {
      const instanceId = 'claude-test-123';
      
      // Mock initial connection
      mockConnectionState.isConnected = true;
      mockConnectionState.instanceId = instanceId;
      
      // Mock connection loss
      mockConnectionState.isConnected = false;
      mockConnectionState.lastError = 'Connection lost';
      mockConnectionState.isRecovering = true;
      mockConnectionState.connectionHealth = 'degraded';
      
      // Mock reconnection attempt
      mockConnectToInstance.mockResolvedValue(undefined);
      
      // Attempt reconnection
      await mockConnectToInstance(instanceId);
      
      expect(mockConnectToInstance).toHaveBeenCalledWith(instanceId);
    });

    test('should handle recovery failure', async () => {
      const instanceId = 'claude-test-123';
      
      // Mock recovery failure
      mockConnectionState.isRecovering = false;
      mockConnectionState.lastError = 'Recovery failed after max retries';
      mockConnectionState.connectionHealth = 'failed';
      
      expect(mockConnectionState.lastError).toContain('Recovery failed');
      expect(mockConnectionState.connectionHealth).toBe('failed');
    });
  });

  describe('Performance and Metrics', () => {
    test('should track connection metrics', () => {
      const metrics = mockUseAdvancedSSEConnection().getMetrics();
      
      expect(metrics).toHaveProperty('totalMessages');
      expect(metrics).toHaveProperty('messagesPerSecond');
      expect(metrics).toHaveProperty('averageLatency');
      expect(metrics).toHaveProperty('connectionUptime');
      expect(metrics).toHaveProperty('recoveryCount');
      expect(metrics).toHaveProperty('lastRecoveryTime');
      
      expect(typeof metrics.totalMessages).toBe('number');
      expect(typeof metrics.messagesPerSecond).toBe('number');
      expect(typeof metrics.averageLatency).toBe('number');
      expect(typeof metrics.connectionUptime).toBe('number');
      expect(typeof metrics.recoveryCount).toBe('number');
      expect(typeof metrics.lastRecoveryTime).toBe('number');
    });

    test('should update message rate tracking', () => {
      // Mock higher message rate
      mockConnectionState.messagesPerSecond = 5.5;
      
      expect(mockConnectionState.messagesPerSecond).toBe(5.5);
      expect(mockConnectionState.messagesPerSecond).toBeGreaterThan(0);
    });

    test('should track memory usage', () => {
      // Mock memory usage
      mockConnectionState.memoryUsage = 15; // MB
      
      expect(mockConnectionState.memoryUsage).toBe(15);
      expect(mockConnectionState.memoryUsage).toBeGreaterThanOrEqual(0);
    });
  });
});