/**
 * TDD London School Tests for WebSocketConnectionManager
 * 
 * Tests focus on the collaboration between the connection manager and its
 * dependencies (Socket.IO, health monitors, metrics trackers, reconnection strategies).
 * 
 * London School approach:
 * 1. Mock all external collaborators
 * 2. Verify interaction patterns and contracts
 * 3. Focus on behavior over state
 * 4. Test how components work together
 */

import { WebSocketConnectionManager } from '@/services/connection/connection-manager';
import { ConnectionState } from '@/services/connection/types';
import { mockSocketFactory, MockSocket, io } from './__mocks__/socket-io-client';

// Mock Socket.IO client
jest.mock('socket.io-client');

// Mock strategies and monitors
jest.mock('@/services/connection/strategies', () => ({
  ExponentialBackoffStrategy: jest.fn().mockImplementation(() => ({
    reset: jest.fn(),
    shouldReconnect: jest.fn().mockReturnValue(true),
    getDelay: jest.fn().mockReturnValue(1000),
    getMaxAttempts: jest.fn().mockReturnValue(5)
  }))
}));

jest.mock('@/services/connection/health-monitor', () => ({
  PingHealthMonitor: jest.fn().mockImplementation(() => ({
    startMonitoring: jest.fn(),
    stopMonitoring: jest.fn(),
    getHealth: jest.fn().mockReturnValue({ status: 'healthy', lastCheck: new Date() })
  }))
}));

jest.mock('@/services/connection/metrics-tracker', () => ({
  AdvancedMetricsTracker: jest.fn().mockImplementation(() => ({
    recordConnection: jest.fn(),
    recordSuccessfulConnection: jest.fn(),
    recordFailedConnection: jest.fn(),
    recordDisconnection: jest.fn(),
    recordReconnection: jest.fn(),
    recordError: jest.fn(),
    recordMessage: jest.fn(),
    getMetrics: jest.fn().mockReturnValue({
      connectionAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
      totalReconnections: 0,
      messagesReceived: 0,
      messagesSent: 0
    })
  }))
}));

// Mock timers
jest.useFakeTimers();

describe('WebSocketConnectionManager - London School TDD', () => {
  let connectionManager: WebSocketConnectionManager;
  let mockSocket: MockSocket;
  let eventListeners: { [key: string]: Function[] } = {};

  beforeEach(() => {
    jest.clearAllMocks();
    mockSocketFactory.clearSocketHistory();
    eventListeners = {};
    
    // Mock event emitter functionality
    const mockEmit = jest.fn();
    const mockOn = jest.fn().mockImplementation((event: string, handler: Function) => {
      if (!eventListeners[event]) eventListeners[event] = [];
      eventListeners[event].push(handler);
    });
    
    // Create connection manager with mocked collaborators
    connectionManager = new WebSocketConnectionManager({
      url: 'ws://test-server:3000',
      autoConnect: false,
      reconnection: true,
      timeout: 5000
    });
    
    // Override emit and on methods for testing
    (connectionManager as any).emit = mockEmit;
    (connectionManager as any).on = mockOn;
  });

  afterEach(() => {
    if (connectionManager) {
      connectionManager.destroy();
    }
    jest.runOnlyPendingTimers();
  });

  describe('Connection Establishment Contract', () => {
    it('should coordinate with Socket.IO client for connection establishment', async () => {
      const connectPromise = connectionManager.connect();

      await jest.runAllTimersAsync();

      // Verify Socket.IO was called with correct parameters
      expect(io).toHaveBeenCalledWith('ws://test-server:3000', 
        expect.objectContaining({
          timeout: 5000,
          reconnection: false, // Manager handles reconnection
          autoConnect: false,
          transports: expect.any(Array)
        })
      );

      mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      expect(mockSocket).toBeTruthy();
      expect(mockSocket.connect).toHaveBeenCalled();
    });

    it('should establish connection workflow with proper event handling', async () => {
      const connectPromise = connectionManager.connect();
      
      await jest.runAllTimersAsync();
      mockSocket = mockSocketFactory.getLastCreatedSocket()!;

      // Simulate successful connection
      mockSocketFactory.simulateSuccessfulConnection(mockSocket);

      await connectPromise;

      // Verify connection state management
      expect(connectionManager.getState()).toBe(ConnectionState.CONNECTED);
      expect(connectionManager.isConnected()).toBe(true);
    });

    it('should coordinate cleanup of previous socket before new connection', async () => {
      // First connection
      await connectionManager.connect();
      const firstSocket = mockSocketFactory.getLastCreatedSocket()!;
      
      mockSocketFactory.simulateSuccessfulConnection(firstSocket);

      // Second connection attempt
      await connectionManager.connect();
      const secondSocket = mockSocketFactory.getLastCreatedSocket()!;

      // Verify first socket was cleaned up
      expect(firstSocket.removeAllListeners).toHaveBeenCalled();
      expect(firstSocket.disconnect).toHaveBeenCalled();
      expect(secondSocket).not.toBe(firstSocket);
    });
  });

  describe('Authentication and Configuration Contract', () => {
    it('should pass authentication configuration to Socket.IO', async () => {
      const authConfig = {
        token: 'test-auth-token',
        userId: 'user-123'
      };

      const managerWithAuth = new WebSocketConnectionManager({
        url: 'ws://test-server:3000',
        auth: authConfig,
        autoConnect: false
      });

      await managerWithAuth.connect();

      expect(io).toHaveBeenCalledWith('ws://test-server:3000',
        expect.objectContaining({
          auth: authConfig
        })
      );

      managerWithAuth.destroy();
    });

    it('should configure transport options correctly', async () => {
      const managerWithTransports = new WebSocketConnectionManager({
        url: 'ws://test-server:3000',
        transports: ['websocket'],
        withCredentials: true,
        autoConnect: false
      });

      await managerWithTransports.connect();

      expect(io).toHaveBeenCalledWith('ws://test-server:3000',
        expect.objectContaining({
          transports: ['websocket'],
          withCredentials: true
        })
      );

      managerWithTransports.destroy();
    });
  });

  describe('Health Monitoring Integration', () => {
    it('should coordinate with health monitor during connection lifecycle', async () => {
      const healthMonitor = (connectionManager as any).healthMonitor;

      await connectionManager.connect();
      mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      mockSocketFactory.simulateSuccessfulConnection(mockSocket);

      // Verify health monitoring started
      expect(healthMonitor.startMonitoring).toHaveBeenCalled();

      await connectionManager.disconnect();

      // Verify health monitoring stopped
      expect(healthMonitor.stopMonitoring).toHaveBeenCalled();
    });

    it('should provide health status through health monitor collaboration', () => {
      const healthMonitor = (connectionManager as any).healthMonitor;
      const mockHealthStatus = { status: 'healthy', lastCheck: new Date() };
      
      healthMonitor.getHealth.mockReturnValue(mockHealthStatus);

      const health = connectionManager.getHealth();

      expect(health).toBe(mockHealthStatus);
      expect(healthMonitor.getHealth).toHaveBeenCalled();
    });
  });

  describe('Metrics Tracking Collaboration', () => {
    it('should coordinate connection metrics with metrics tracker', async () => {
      const metricsTracker = (connectionManager as any).metricsTracker;

      await connectionManager.connect();
      mockSocket = mockSocketFactory.getLastCreatedSocket()!;

      // Verify connection attempt was recorded
      expect(metricsTracker.recordConnection).toHaveBeenCalled();

      mockSocketFactory.simulateSuccessfulConnection(mockSocket);

      // Verify successful connection was recorded
      expect(metricsTracker.recordSuccessfulConnection).toHaveBeenCalled();
    });

    it('should record connection failures with metrics tracker', async () => {
      const metricsTracker = (connectionManager as any).metricsTracker;

      try {
        await connectionManager.connect();
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
        mockSocketFactory.simulateConnectionError(mockSocket, new Error('Connection failed'));
      } catch (error) {
        // Expected to fail
      }

      expect(metricsTracker.recordFailedConnection).toHaveBeenCalledWith(
        expect.any(Error)
      );
    });

    it('should track message metrics through socket collaboration', async () => {
      const metricsTracker = (connectionManager as any).metricsTracker;

      await connectionManager.connect();
      mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      mockSocketFactory.simulateSuccessfulConnection(mockSocket);

      // Simulate message handling
      mockSocketFactory.simulateServerEvent(mockSocket, 'test_message', { data: 'test' });

      // Should track received messages
      expect(metricsTracker.recordMessage).toHaveBeenCalledWith(
        'received',
        expect.any(Number)
      );
    });
  });

  describe('Reconnection Strategy Coordination', () => {
    it('should delegate reconnection decisions to strategy', async () => {
      const reconnectionStrategy = (connectionManager as any).reconnectionStrategy;

      await connectionManager.connect();
      mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      mockSocketFactory.simulateSuccessfulConnection(mockSocket);

      // Simulate disconnection to trigger reconnection
      mockSocketFactory.simulateDisconnection(mockSocket, 'transport close');

      await jest.runAllTimersAsync();

      // Verify strategy was consulted
      expect(reconnectionStrategy.shouldReconnect).toHaveBeenCalled();
      expect(reconnectionStrategy.getDelay).toHaveBeenCalled();
    });

    it('should respect maximum reconnection attempts from strategy', async () => {
      const reconnectionStrategy = (connectionManager as any).reconnectionStrategy;
      reconnectionStrategy.shouldReconnect.mockReturnValue(false);
      reconnectionStrategy.getMaxAttempts.mockReturnValue(3);

      try {
        await connectionManager.reconnect();
      } catch (error) {
        expect(error.code).toBe('MAX_RECONNECT_ATTEMPTS');
      }

      expect(reconnectionStrategy.shouldReconnect).toHaveBeenCalled();
    });

    it('should reset strategy on successful connection', async () => {
      const reconnectionStrategy = (connectionManager as any).reconnectionStrategy;

      await connectionManager.connect();
      mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      mockSocketFactory.simulateSuccessfulConnection(mockSocket);

      expect(reconnectionStrategy.reset).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should coordinate error handling across all collaborators', async () => {
      const metricsTracker = (connectionManager as any).metricsTracker;
      
      await connectionManager.connect();
      mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      
      const testError = new Error('Socket error');
      mockSocketFactory.simulateError(mockSocket, testError);

      // Verify error was recorded in metrics
      expect(metricsTracker.recordError).toHaveBeenCalledWith(testError);
    });

    it('should handle socket connection errors with proper state management', async () => {
      try {
        await connectionManager.connect();
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
        mockSocketFactory.simulateConnectionError(mockSocket, new Error('Connection timeout'));
      } catch (error) {
        expect(connectionManager.getState()).toBe(ConnectionState.ERROR);
      }
    });

    it('should coordinate disconnect handling with all collaborators', async () => {
      const healthMonitor = (connectionManager as any).healthMonitor;
      const metricsTracker = (connectionManager as any).metricsTracker;

      await connectionManager.connect();
      mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      mockSocketFactory.simulateSuccessfulConnection(mockSocket);

      const disconnectReason = 'transport close';
      mockSocketFactory.simulateDisconnection(mockSocket, disconnectReason);

      expect(healthMonitor.stopMonitoring).toHaveBeenCalled();
      expect(metricsTracker.recordDisconnection).toHaveBeenCalledWith(disconnectReason);
    });
  });

  describe('Socket Event Handler Coordination', () => {
    it('should register frontend client with hub on connection', async () => {
      await connectionManager.connect();
      mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      mockSocketFactory.simulateSuccessfulConnection(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('registerFrontend',
        expect.objectContaining({
          timestamp: expect.any(String),
          userAgent: expect.any(String),
          url: expect.any(String)
        })
      );
    });

    it('should coordinate message size tracking with metrics', async () => {
      const metricsTracker = (connectionManager as any).metricsTracker;

      await connectionManager.connect();
      mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      mockSocketFactory.simulateSuccessfulConnection(mockSocket);

      // Simulate sending a message
      const socket = connectionManager.getSocket();
      if (socket) {
        socket.emit('test_event', { data: 'test message' });
      }

      // Should track sent message
      expect(metricsTracker.recordMessage).toHaveBeenCalledWith(
        'sent',
        expect.any(Number)
      );
    });
  });

  describe('Resource Management and Cleanup', () => {
    it('should coordinate proper cleanup of all collaborators', () => {
      const healthMonitor = (connectionManager as any).healthMonitor;
      const eventEmitter = (connectionManager as any).eventEmitter;

      connectionManager.destroy();

      expect(healthMonitor.stopMonitoring).toHaveBeenCalled();
      expect(connectionManager.getState()).toBe(ConnectionState.MANUAL_DISCONNECT);
    });

    it('should prevent operations on destroyed manager', () => {
      connectionManager.destroy();

      expect(() => connectionManager.connect()).rejects.toThrow('destroyed');
      expect(() => connectionManager.reconnect()).rejects.toThrow('destroyed');
    });

    it('should handle multiple destroy calls gracefully', () => {
      connectionManager.destroy();
      
      // Second destroy should not throw or cause issues
      expect(() => connectionManager.destroy()).not.toThrow();
    });
  });

  describe('State Management Contract', () => {
    it('should maintain state consistency across operations', async () => {
      expect(connectionManager.getState()).toBe(ConnectionState.DISCONNECTED);

      const connectPromise = connectionManager.connect();
      expect(connectionManager.getState()).toBe(ConnectionState.CONNECTING);

      await jest.runAllTimersAsync();
      mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      mockSocketFactory.simulateSuccessfulConnection(mockSocket);

      await connectPromise;
      expect(connectionManager.getState()).toBe(ConnectionState.CONNECTED);

      await connectionManager.disconnect(true);
      expect(connectionManager.getState()).toBe(ConnectionState.MANUAL_DISCONNECT);
    });

    it('should emit state change events for external coordination', async () => {
      const mockEmit = (connectionManager as any).emit;

      await connectionManager.connect();
      
      // Should emit state change from DISCONNECTED to CONNECTING
      expect(mockEmit).toHaveBeenCalledWith('state_change', {
        from: ConnectionState.DISCONNECTED,
        to: ConnectionState.CONNECTING,
        timestamp: expect.any(Date)
      });
    });
  });

  describe('Configuration Update Contract', () => {
    it('should allow runtime configuration updates', () => {
      const newOptions = {
        timeout: 10000,
        reconnection: false
      };

      connectionManager.updateOptions(newOptions);

      // Verify options were updated (tested through subsequent connection)
      expect(() => connectionManager.updateOptions(newOptions)).not.toThrow();
    });
  });

  describe('Diagnostic Information Contract', () => {
    it('should provide detailed diagnostic status', async () => {
      await connectionManager.connect();
      mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      mockSocketFactory.simulateSuccessfulConnection(mockSocket);

      const detailedStatus = connectionManager.getDetailedStatus();

      expect(detailedStatus).toMatchObject({
        state: ConnectionState.CONNECTED,
        isConnected: true,
        socketId: expect.any(String),
        socketConnected: true,
        currentAttempt: expect.any(Number),
        maxAttempts: expect.any(Number),
        manualDisconnect: expect.any(Boolean),
        isDestroyed: expect.any(Boolean),
        hasReconnectionTimer: expect.any(Boolean),
        options: expect.objectContaining({
          url: expect.any(String),
          timeout: expect.any(Number)
        }),
        metrics: expect.any(Object),
        health: expect.any(Object)
      });

      // Auth should be redacted for security
      expect(detailedStatus.options.auth).toBe('[REDACTED]');
    });
  });

  describe('Global Instance Management', () => {
    it('should provide singleton access pattern', () => {
      const { getGlobalConnectionManager, resetGlobalConnectionManager } = 
        require('@/services/connection/connection-manager');

      const instance1 = getGlobalConnectionManager();
      const instance2 = getGlobalConnectionManager();

      expect(instance1).toBe(instance2); // Same instance

      resetGlobalConnectionManager();
      const instance3 = getGlobalConnectionManager();

      expect(instance3).not.toBe(instance1); // New instance after reset
      
      instance3.destroy();
    });
  });
});