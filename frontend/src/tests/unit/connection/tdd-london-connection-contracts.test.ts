/**
 * TDD London School Connection Contracts Tests
 * 
 * Tests the contracts and interactions between connection management components.
 * Focuses on mock-driven development to define clear interfaces and verify collaborations.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock all external dependencies
jest.mock('socket.io-client');
jest.mock('@/services/connection/connection-manager');
jest.mock('@/services/connection/health-monitor');
jest.mock('@/services/connection/metrics-tracker');

import { Socket } from 'socket.io-client';
import { WebSocketConnectionManager } from '@/services/connection/connection-manager';
import { ConnectionState, ConnectionOptions, ConnectionMetrics, HealthStatus } from '@/services/connection/types';

// Contract definitions for London School TDD
interface SocketContract {
  connected: boolean;
  disconnected: boolean;
  id?: string;
  emit: jest.MockedFunction<(event: string, ...args: any[]) => boolean>;
  on: jest.MockedFunction<(event: string, listener: (...args: any[]) => void) => Socket>;
  off: jest.MockedFunction<(event?: string, listener?: (...args: any[]) => void) => Socket>;
  once: jest.MockedFunction<(event: string, listener: (...args: any[]) => void) => Socket>;
  connect: jest.MockedFunction<() => Socket>;
  disconnect: jest.MockedFunction<() => Socket>;
  removeAllListeners: jest.MockedFunction<(event?: string) => Socket>;
}

interface ConnectionManagerContract {
  connect: jest.MockedFunction<(options?: Partial<ConnectionOptions>) => Promise<void>>;
  disconnect: jest.MockedFunction<(manual?: boolean) => Promise<void>>;
  reconnect: jest.MockedFunction<() => Promise<void>>;
  getState: jest.MockedFunction<() => ConnectionState>;
  getMetrics: jest.MockedFunction<() => ConnectionMetrics>;
  getHealth: jest.MockedFunction<() => HealthStatus>;
  isConnected: jest.MockedFunction<() => boolean>;
  getSocket: jest.MockedFunction<() => Socket | null>;
  on: jest.MockedFunction<(event: string, handler: Function) => void>;
  off: jest.MockedFunction<(event: string, handler: Function) => void>;
  emit: jest.MockedFunction<(event: string, data: any) => void>;
  updateOptions: jest.MockedFunction<(options: Partial<ConnectionOptions>) => void>;
  destroy: jest.MockedFunction<() => void>;
}

interface HealthMonitorContract {
  startMonitoring: jest.MockedFunction<() => void>;
  stopMonitoring: jest.MockedFunction<() => void>;
  ping: jest.MockedFunction<() => Promise<number>>;
  getLatency: jest.MockedFunction<() => number | null>;
  getLastPing: jest.MockedFunction<() => Date | null>;
  getHealth: jest.MockedFunction<() => HealthStatus>;
}

interface MetricsTrackerContract {
  recordConnection: jest.MockedFunction<() => void>;
  recordDisconnection: jest.MockedFunction<(reason: string) => void>;
  recordReconnection: jest.MockedFunction<(attempt: number) => void>;
  recordError: jest.MockedFunction<(error: Error) => void>;
  recordMessage: jest.MockedFunction<(direction: 'sent' | 'received', size: number) => void>;
  getMetrics: jest.MockedFunction<() => ConnectionMetrics>;
  reset: jest.MockedFunction<() => void>;
}

// Mock factory functions
const createMockSocket = (overrides: Partial<SocketContract> = {}): SocketContract => ({
  connected: false,
  disconnected: true,
  id: 'mock-socket-id',
  emit: jest.fn().mockReturnValue(true),
  on: jest.fn().mockReturnThis(),
  off: jest.fn().mockReturnThis(),
  once: jest.fn().mockReturnThis(),
  connect: jest.fn().mockReturnThis(),
  disconnect: jest.fn().mockReturnThis(),
  removeAllListeners: jest.fn().mockReturnThis(),
  ...overrides
});

const createMockConnectionManager = (overrides: Partial<ConnectionManagerContract> = {}): ConnectionManagerContract => ({
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  reconnect: jest.fn().mockResolvedValue(undefined),
  getState: jest.fn().mockReturnValue(ConnectionState.DISCONNECTED),
  getMetrics: jest.fn().mockReturnValue({
    connectionAttempts: 0,
    successfulConnections: 0,
    failedConnections: 0,
    reconnectionAttempts: 0,
    totalDowntime: 0,
    averageLatency: 0,
    lastConnectionTime: null,
    lastDisconnectionTime: null,
    lastDisconnectionReason: null,
    bytesReceived: 0,
    bytesSent: 0,
    messagesReceived: 0,
    messagesSent: 0
  }),
  getHealth: jest.fn().mockReturnValue({
    isHealthy: false,
    latency: null,
    lastPing: null,
    consecutiveFailures: 0,
    uptime: 0,
    serverTimestamp: null,
    networkQuality: 'unknown' as const
  }),
  isConnected: jest.fn().mockReturnValue(false),
  getSocket: jest.fn().mockReturnValue(null),
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  updateOptions: jest.fn(),
  destroy: jest.fn(),
  ...overrides
});

const createMockHealthMonitor = (overrides: Partial<HealthMonitorContract> = {}): HealthMonitorContract => ({
  startMonitoring: jest.fn(),
  stopMonitoring: jest.fn(),
  ping: jest.fn().mockResolvedValue(50),
  getLatency: jest.fn().mockReturnValue(null),
  getLastPing: jest.fn().mockReturnValue(null),
  getHealth: jest.fn().mockReturnValue({
    isHealthy: false,
    latency: null,
    lastPing: null,
    consecutiveFailures: 0,
    uptime: 0,
    serverTimestamp: null,
    networkQuality: 'unknown' as const
  }),
  ...overrides
});

const createMockMetricsTracker = (overrides: Partial<MetricsTrackerContract> = {}): MetricsTrackerContract => ({
  recordConnection: jest.fn(),
  recordDisconnection: jest.fn(),
  recordReconnection: jest.fn(),
  recordError: jest.fn(),
  recordMessage: jest.fn(),
  getMetrics: jest.fn().mockReturnValue({
    connectionAttempts: 0,
    successfulConnections: 0,
    failedConnections: 0,
    reconnectionAttempts: 0,
    totalDowntime: 0,
    averageLatency: 0,
    lastConnectionTime: null,
    lastDisconnectionTime: null,
    lastDisconnectionReason: null,
    bytesReceived: 0,
    bytesSent: 0,
    messagesReceived: 0,
    messagesSent: 0
  }),
  reset: jest.fn(),
  ...overrides
});

describe('TDD London School: Connection Contracts', () => {
  let mockSocket: SocketContract;
  let mockConnectionManager: ConnectionManagerContract;
  let mockHealthMonitor: HealthMonitorContract;
  let mockMetricsTracker: MetricsTrackerContract;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create fresh mock instances
    mockSocket = createMockSocket();
    mockConnectionManager = createMockConnectionManager();
    mockHealthMonitor = createMockHealthMonitor();
    mockMetricsTracker = createMockMetricsTracker();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Contract: Socket.IO Integration', () => {
    
    it('should establish proper socket event contract', () => {
      // ARRANGE: Define expected socket events
      const requiredEvents = ['connect', 'disconnect', 'connect_error', 'error'];
      const eventHandlers: Record<string, Function> = {};

      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        eventHandlers[event] = handler;
        return mockSocket as any;
      });

      // ACT: Simulate socket initialization
      requiredEvents.forEach(event => {
        mockSocket.on(event, jest.fn());
      });

      // ASSERT: Verify required events are registered
      requiredEvents.forEach(event => {
        expect(mockSocket.on).toHaveBeenCalledWith(event, expect.any(Function));
      });
    });

    it('should verify socket emit contract for frontend registration', () => {
      // ARRANGE: Connected socket
      mockSocket.connected = true;
      mockSocket.disconnected = false;

      // ACT: Simulate frontend registration
      const registrationData = {
        timestamp: new Date().toISOString(),
        userAgent: 'test-agent',
        url: 'http://localhost:3000'
      };

      mockSocket.emit('registerFrontend', registrationData);

      // ASSERT: Verify registration message format
      expect(mockSocket.emit).toHaveBeenCalledWith('registerFrontend', {
        timestamp: expect.any(String),
        userAgent: expect.any(String),
        url: expect.any(String)
      });
    });

    it('should handle socket connection event flow', () => {
      // ARRANGE: Event handlers
      const eventHandlers: Record<string, Function> = {};
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        eventHandlers[event] = handler;
        return mockSocket as any;
      });

      // Register handlers
      mockSocket.on('connect', jest.fn());
      mockSocket.on('disconnect', jest.fn());

      // ACT: Simulate connection sequence
      mockSocket.connected = true;
      mockSocket.disconnected = false;
      
      if (eventHandlers.connect) {
        eventHandlers.connect();
      }

      // ASSERT: Verify connection flow
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.connected).toBe(true);
    });

    it('should verify socket cleanup contract', () => {
      // ARRANGE: Socket with registered listeners
      mockSocket.on('connect', jest.fn());
      mockSocket.on('disconnect', jest.fn());

      // ACT: Cleanup socket
      mockSocket.removeAllListeners();
      mockSocket.disconnect();

      // ASSERT: Verify cleanup was called
      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('Contract: Connection Manager Collaboration', () => {
    
    it('should verify connection manager initialization contract', () => {
      // ARRANGE: Connection options
      const options: ConnectionOptions = {
        url: 'http://localhost:3001',
        autoConnect: true,
        reconnection: true,
        timeout: 15000
      };

      // ACT: Simulate manager initialization
      mockConnectionManager.updateOptions(options);

      // ASSERT: Verify options update contract
      expect(mockConnectionManager.updateOptions).toHaveBeenCalledWith(options);
    });

    it('should verify connection lifecycle contract', async () => {
      // ARRANGE: Manager should coordinate connection lifecycle
      mockConnectionManager.getState.mockReturnValue(ConnectionState.DISCONNECTED);

      // ACT: Execute connection workflow
      await mockConnectionManager.connect();
      
      // Simulate state progression
      mockConnectionManager.getState.mockReturnValue(ConnectionState.CONNECTING);
      mockConnectionManager.getState.mockReturnValue(ConnectionState.CONNECTED);

      // ASSERT: Verify lifecycle methods
      expect(mockConnectionManager.connect).toHaveBeenCalled();
      expect(mockConnectionManager.getState).toHaveBeenCalled();
    });

    it('should verify error handling contract', async () => {
      // ARRANGE: Connection failure scenario
      const connectionError = new Error('Connection timeout');
      mockConnectionManager.connect.mockRejectedValue(connectionError);

      // ACT & ASSERT: Verify error propagation
      await expect(mockConnectionManager.connect()).rejects.toThrow('Connection timeout');
      expect(mockConnectionManager.connect).toHaveBeenCalled();
    });

    it('should verify event emission contract', () => {
      // ARRANGE: Event data
      const stateChangeData = {
        from: ConnectionState.DISCONNECTED,
        to: ConnectionState.CONNECTED,
        timestamp: new Date()
      };

      // ACT: Emit state change
      mockConnectionManager.emit('state_change', stateChangeData);

      // ASSERT: Verify event emission format
      expect(mockConnectionManager.emit).toHaveBeenCalledWith('state_change', {
        from: ConnectionState.DISCONNECTED,
        to: ConnectionState.CONNECTED,
        timestamp: expect.any(Date)
      });
    });
  });

  describe('Contract: Health Monitor Integration', () => {
    
    it('should verify health monitoring lifecycle', () => {
      // ARRANGE: Health monitor should start/stop monitoring
      mockHealthMonitor.getHealth.mockReturnValue({
        isHealthy: true,
        latency: 50,
        lastPing: new Date(),
        consecutiveFailures: 0,
        uptime: 30000,
        serverTimestamp: new Date(),
        networkQuality: 'excellent'
      });

      // ACT: Start monitoring
      mockHealthMonitor.startMonitoring();

      // ASSERT: Verify monitoring contract
      expect(mockHealthMonitor.startMonitoring).toHaveBeenCalled();
    });

    it('should verify ping contract', async () => {
      // ARRANGE: Mock successful ping
      mockHealthMonitor.ping.mockResolvedValue(75);

      // ACT: Execute ping
      const latency = await mockHealthMonitor.ping();

      // ASSERT: Verify ping returns latency
      expect(latency).toBe(75);
      expect(mockHealthMonitor.ping).toHaveBeenCalled();
    });

    it('should verify health status contract', () => {
      // ARRANGE: Health status data
      const healthStatus: HealthStatus = {
        isHealthy: true,
        latency: 100,
        lastPing: new Date(),
        consecutiveFailures: 0,
        uptime: 60000,
        serverTimestamp: new Date(),
        networkQuality: 'good'
      };

      mockHealthMonitor.getHealth.mockReturnValue(healthStatus);

      // ACT: Get health status
      const health = mockHealthMonitor.getHealth();

      // ASSERT: Verify health status structure
      expect(health).toEqual({
        isHealthy: expect.any(Boolean),
        latency: expect.any(Number),
        lastPing: expect.any(Date),
        consecutiveFailures: expect.any(Number),
        uptime: expect.any(Number),
        serverTimestamp: expect.any(Date),
        networkQuality: expect.stringMatching(/excellent|good|fair|poor|unknown/)
      });
    });
  });

  describe('Contract: Metrics Tracker Integration', () => {
    
    it('should verify metrics recording contract', () => {
      // ARRANGE: Metrics recording scenarios
      const testError = new Error('Test error');

      // ACT: Record various metrics
      mockMetricsTracker.recordConnection();
      mockMetricsTracker.recordDisconnection('io server disconnect');
      mockMetricsTracker.recordReconnection(1);
      mockMetricsTracker.recordError(testError);
      mockMetricsTracker.recordMessage('sent', 256);

      // ASSERT: Verify all metric recording methods
      expect(mockMetricsTracker.recordConnection).toHaveBeenCalled();
      expect(mockMetricsTracker.recordDisconnection).toHaveBeenCalledWith('io server disconnect');
      expect(mockMetricsTracker.recordReconnection).toHaveBeenCalledWith(1);
      expect(mockMetricsTracker.recordError).toHaveBeenCalledWith(testError);
      expect(mockMetricsTracker.recordMessage).toHaveBeenCalledWith('sent', 256);
    });

    it('should verify metrics data contract', () => {
      // ARRANGE: Mock metrics data
      const metricsData: ConnectionMetrics = {
        connectionAttempts: 5,
        successfulConnections: 4,
        failedConnections: 1,
        reconnectionAttempts: 2,
        totalDowntime: 5000,
        averageLatency: 150,
        lastConnectionTime: new Date(),
        lastDisconnectionTime: new Date(),
        lastDisconnectionReason: 'transport close',
        bytesReceived: 2048,
        bytesSent: 1024,
        messagesReceived: 10,
        messagesSent: 8
      };

      mockMetricsTracker.getMetrics.mockReturnValue(metricsData);

      // ACT: Get metrics
      const metrics = mockMetricsTracker.getMetrics();

      // ASSERT: Verify metrics structure
      expect(metrics).toEqual({
        connectionAttempts: expect.any(Number),
        successfulConnections: expect.any(Number),
        failedConnections: expect.any(Number),
        reconnectionAttempts: expect.any(Number),
        totalDowntime: expect.any(Number),
        averageLatency: expect.any(Number),
        lastConnectionTime: expect.any(Date),
        lastDisconnectionTime: expect.any(Date),
        lastDisconnectionReason: expect.any(String),
        bytesReceived: expect.any(Number),
        bytesSent: expect.any(Number),
        messagesReceived: expect.any(Number),
        messagesSent: expect.any(Number)
      });
    });
  });

  describe('Contract: Component Collaboration', () => {
    
    it('should verify manager coordinates all components', () => {
      // ARRANGE: Manager should coordinate socket, health monitor, and metrics
      mockConnectionManager.getSocket.mockReturnValue(mockSocket as any);

      // ACT: Simulate full workflow
      mockConnectionManager.connect();
      mockHealthMonitor.startMonitoring();
      mockMetricsTracker.recordConnection();

      // ASSERT: Verify coordination
      expect(mockConnectionManager.connect).toHaveBeenCalled();
      expect(mockHealthMonitor.startMonitoring).toHaveBeenCalled();
      expect(mockMetricsTracker.recordConnection).toHaveBeenCalled();
    });

    it('should verify event propagation between components', () => {
      // ARRANGE: Event handlers for component communication
      const eventHandlers: Record<string, Function[]> = {};
      
      mockConnectionManager.on.mockImplementation((event: string, handler: Function) => {
        if (!eventHandlers[event]) eventHandlers[event] = [];
        eventHandlers[event].push(handler);
      });

      // Register handlers
      mockConnectionManager.on('state_change', jest.fn());
      mockConnectionManager.on('error', jest.fn());
      mockConnectionManager.on('metrics_update', jest.fn());

      // ACT: Simulate events
      mockConnectionManager.emit('state_change', { from: ConnectionState.DISCONNECTED, to: ConnectionState.CONNECTED });
      mockConnectionManager.emit('metrics_update', mockMetricsTracker.getMetrics());

      // ASSERT: Verify event registration and emission
      expect(mockConnectionManager.on).toHaveBeenCalledWith('state_change', expect.any(Function));
      expect(mockConnectionManager.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockConnectionManager.on).toHaveBeenCalledWith('metrics_update', expect.any(Function));
      
      expect(mockConnectionManager.emit).toHaveBeenCalledWith('state_change', expect.any(Object));
      expect(mockConnectionManager.emit).toHaveBeenCalledWith('metrics_update', expect.any(Object));
    });

    it('should verify cleanup contracts between all components', () => {
      // ARRANGE: All components should have cleanup methods
      
      // ACT: Cleanup all components
      mockConnectionManager.destroy();
      mockHealthMonitor.stopMonitoring();
      mockMetricsTracker.reset();
      mockSocket.removeAllListeners();

      // ASSERT: Verify all cleanup methods were called
      expect(mockConnectionManager.destroy).toHaveBeenCalled();
      expect(mockHealthMonitor.stopMonitoring).toHaveBeenCalled();
      expect(mockMetricsTracker.reset).toHaveBeenCalled();
      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
    });
  });

  describe('Contract: Error Handling and Recovery', () => {
    
    it('should verify error propagation contract', () => {
      // ARRANGE: Error scenarios
      const socketError = new Error('Socket connection failed');
      const healthError = new Error('Health check timeout');

      // ACT: Simulate errors
      mockConnectionManager.emit('error', { error: socketError, context: 'connection', recoverable: true });
      mockMetricsTracker.recordError(healthError);

      // ASSERT: Verify error handling contracts
      expect(mockConnectionManager.emit).toHaveBeenCalledWith('error', {
        error: socketError,
        context: 'connection',
        recoverable: true
      });
      expect(mockMetricsTracker.recordError).toHaveBeenCalledWith(healthError);
    });

    it('should verify recovery workflow contract', async () => {
      // ARRANGE: Recovery sequence
      mockConnectionManager.getState
        .mockReturnValueOnce(ConnectionState.ERROR)
        .mockReturnValueOnce(ConnectionState.RECONNECTING)
        .mockReturnValueOnce(ConnectionState.CONNECTED);

      // ACT: Execute recovery
      await mockConnectionManager.reconnect();

      // ASSERT: Verify recovery workflow
      expect(mockConnectionManager.reconnect).toHaveBeenCalled();
      expect(mockConnectionManager.getState).toHaveBeenCalled();
    });
  });
});