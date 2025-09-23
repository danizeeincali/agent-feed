/**
 * TDD London School Tests: Connection Manager Mock Validation
 * 
 * Tests that validate the exact behavior of the ConnectionManager and identify
 * if the issue is in the manager itself or in how it propagates state changes.
 * 
 * These tests mock the exact browser WebSocket environment to test the manager
 * in isolation and verify it correctly tracks connection state.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { act } from '@testing-library/react';

// Mock exact browser WebSocket environment
const mockSocketInstance = {
  id: 'mock-socket-id',
  connected: false,
  disconnected: true,
  connect: jest.fn(),
  disconnect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  removeAllListeners: jest.fn(),
  once: jest.fn(),
  onAny: jest.fn()
};

// Mock socket.io-client to return controlled socket
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocketInstance)
}));

// Mock connection types and strategies
jest.mock('@/services/connection/types', () => ({
  ConnectionState: {
    DISCONNECTED: 'DISCONNECTED',
    CONNECTING: 'CONNECTING',
    CONNECTED: 'CONNECTED',
    RECONNECTING: 'RECONNECTING',
    ERROR: 'ERROR',
    MANUAL_DISCONNECT: 'MANUAL_DISCONNECT'
  },
  DEFAULT_CONNECTION_CONFIG: {
    defaultOptions: {
      url: 'http://localhost:3001',
      autoConnect: true,
      reconnection: true,
      timeout: 15000
    },
    reconnection: {
      baseDelay: 1000,
      maxDelay: 5000,
      maxAttempts: 5,
      jitter: true
    },
    healthCheck: {
      enabled: true,
      interval: 30000,
      timeout: 5000,
      maxFailures: 3
    }
  }
}));

jest.mock('@/services/connection/strategies', () => ({
  ExponentialBackoffStrategy: jest.fn().mockImplementation(() => ({
    shouldReconnect: jest.fn().mockReturnValue(true),
    getDelay: jest.fn().mockReturnValue(1000),
    getMaxAttempts: jest.fn().mockReturnValue(5),
    reset: jest.fn()
  }))
}));

jest.mock('@/services/connection/health-monitor', () => ({
  PingHealthMonitor: jest.fn().mockImplementation(() => ({
    startMonitoring: jest.fn(),
    stopMonitoring: jest.fn(),
    getHealth: jest.fn().mockReturnValue({ status: 'healthy' })
  }))
}));

jest.mock('@/services/connection/metrics-tracker', () => ({
  AdvancedMetricsTracker: jest.fn().mockImplementation(() => ({
    recordConnection: jest.fn(),
    recordSuccessfulConnection: jest.fn(),
    recordFailedConnection: jest.fn(),
    recordDisconnection: jest.fn(),
    recordReconnection: jest.fn(),
    recordMessage: jest.fn(),
    recordError: jest.fn(),
    getMetrics: jest.fn().mockReturnValue({ connections: 0, errors: 0 })
  }))
}));

// Import after mocking
import { WebSocketConnectionManager } from '@/services/connection/connection-manager';
import { io } from 'socket.io-client';

describe('TDD London School: Connection Manager Mock Validation', () => {
  let connectionManager: WebSocketConnectionManager;
  let eventEmitterSpy: Map<string, Function[]>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock socket state
    mockSocketInstance.connected = false;
    mockSocketInstance.disconnected = true;
    mockSocketInstance.id = 'test-socket';
    
    // Track event registrations
    eventEmitterSpy = new Map();
    mockSocketInstance.on.mockImplementation((event: string, handler: Function) => {
      if (!eventEmitterSpy.has(event)) {
        eventEmitterSpy.set(event, []);
      }
      eventEmitterSpy.get(event)!.push(handler);
    });

    // Create connection manager with test config
    connectionManager = new WebSocketConnectionManager({
      url: 'http://localhost:3001',
      autoConnect: false,
      reconnection: true,
      timeout: 5000
    });
  });

  afterEach(() => {
    if (connectionManager) {
      connectionManager.destroy();
    }
  });

  describe('Connection Manager State Tracking', () => {
    it('should correctly track socket connection state changes', async () => {
      // ASSERT: Should start disconnected
      expect(connectionManager.isConnected()).toBe(false);
      expect(connectionManager.getState()).toBe('DISCONNECTED');

      // ACT: Initiate connection
      const connectPromise = connectionManager.connect();

      // ASSERT: Should be in connecting state
      expect(connectionManager.getState()).toBe('CONNECTING');

      // ACT: Simulate successful socket connection
      await act(async () => {
        mockSocketInstance.connected = true;
        mockSocketInstance.disconnected = false;
        
        // Trigger connect event
        const connectHandlers = eventEmitterSpy.get('connect') || [];
        connectHandlers.forEach(handler => handler());
      });

      await connectPromise;

      // BEHAVIOR VERIFICATION: Manager should track connection
      expect(connectionManager.isConnected()).toBe(true);
      expect(connectionManager.getState()).toBe('CONNECTED');
      expect(mockSocketInstance.connected).toBe(true);
    });

    it('should detect socket disconnection and update state', async () => {
      // ARRANGE: Start with connected socket
      await connectionManager.connect();
      
      await act(async () => {
        mockSocketInstance.connected = true;
        const connectHandlers = eventEmitterSpy.get('connect') || [];
        connectHandlers.forEach(handler => handler());
      });

      expect(connectionManager.isConnected()).toBe(true);

      // ACT: Simulate socket disconnection
      await act(async () => {
        mockSocketInstance.connected = false;
        mockSocketInstance.disconnected = true;
        
        // Trigger disconnect event
        const disconnectHandlers = eventEmitterSpy.get('disconnect') || [];
        disconnectHandlers.forEach(handler => handler('transport close'));
      });

      // BEHAVIOR VERIFICATION: Manager should detect disconnection
      expect(connectionManager.isConnected()).toBe(false);
      expect(connectionManager.getState()).toBe('DISCONNECTED');
    });

    it('should handle connection errors correctly', async () => {
      // ACT: Simulate connection error
      const connectPromise = connectionManager.connect();

      await act(async () => {
        const error = new Error('Connection failed');
        const errorHandlers = eventEmitterSpy.get('connect_error') || [];
        errorHandlers.forEach(handler => handler(error));
      });

      // BEHAVIOR VERIFICATION: Manager should handle error
      try {
        await connectPromise;
      } catch (error) {
        expect(error).toBeDefined();
      }

      expect(connectionManager.getState()).toBe('ERROR');
      expect(connectionManager.isConnected()).toBe(false);
    });
  });

  describe('Connection Manager Event Emission', () => {
    it('should emit connected event when socket connects', async () => {
      // ARRANGE: Listen for manager events
      const eventListener = jest.fn();
      connectionManager.on('connected', eventListener);

      // ACT: Connect and simulate socket connection
      const connectPromise = connectionManager.connect();

      await act(async () => {
        mockSocketInstance.connected = true;
        const connectHandlers = eventEmitterSpy.get('connect') || [];
        connectHandlers.forEach(handler => handler());
      });

      await connectPromise;

      // BEHAVIOR VERIFICATION: Manager should emit connected event
      expect(eventListener).toHaveBeenCalledWith(expect.objectContaining({
        timestamp: expect.any(Date),
        attempt: expect.any(Number)
      }));
    });

    it('should emit disconnected event when socket disconnects', async () => {
      // ARRANGE: Connect first
      await connectionManager.connect();
      await act(async () => {
        mockSocketInstance.connected = true;
        const connectHandlers = eventEmitterSpy.get('connect') || [];
        connectHandlers.forEach(handler => handler());
      });

      // Listen for disconnect events
      const disconnectListener = jest.fn();
      connectionManager.on('disconnected', disconnectListener);

      // ACT: Simulate disconnection
      await act(async () => {
        mockSocketInstance.connected = false;
        const disconnectHandlers = eventEmitterSpy.get('disconnect') || [];
        disconnectHandlers.forEach(handler => handler('transport error'));
      });

      // BEHAVIOR VERIFICATION: Manager should emit disconnect event
      expect(disconnectListener).toHaveBeenCalledWith(expect.objectContaining({
        timestamp: expect.any(Date),
        reason: 'transport error',
        manual: expect.any(Boolean)
      }));
    });

    it('should emit state_change events when state changes', async () => {
      // ARRANGE: Listen for state changes
      const stateChangeListener = jest.fn();
      connectionManager.on('state_change', stateChangeListener);

      // ACT: Connect
      const connectPromise = connectionManager.connect();

      // BEHAVIOR VERIFICATION: Should emit state change from DISCONNECTED to CONNECTING
      expect(stateChangeListener).toHaveBeenCalledWith(expect.objectContaining({
        from: 'DISCONNECTED',
        to: 'CONNECTING',
        timestamp: expect.any(Date)
      }));

      // ACT: Complete connection
      await act(async () => {
        mockSocketInstance.connected = true;
        const connectHandlers = eventEmitterSpy.get('connect') || [];
        connectHandlers.forEach(handler => handler());
      });

      await connectPromise;

      // BEHAVIOR VERIFICATION: Should emit state change to CONNECTED
      expect(stateChangeListener).toHaveBeenCalledWith(expect.objectContaining({
        from: 'CONNECTING',
        to: 'CONNECTED',
        timestamp: expect.any(Date)
      }));
    });
  });

  describe('Socket Registration and Management', () => {
    it('should register required event handlers on socket', async () => {
      // ACT: Connect to trigger socket creation and handler registration
      await connectionManager.connect();

      // BEHAVIOR VERIFICATION: Should register all required handlers
      expect(mockSocketInstance.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocketInstance.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocketInstance.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
      expect(mockSocketInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockSocketInstance.onAny).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should return correct socket instance', async () => {
      // ACT: Connect
      await connectionManager.connect();

      // ASSERT: Should return the socket instance
      const socket = connectionManager.getSocket();
      expect(socket).toBe(mockSocketInstance);
    });

    it('should clean up socket when disconnecting', async () => {
      // ARRANGE: Connect first
      await connectionManager.connect();
      expect(connectionManager.getSocket()).toBe(mockSocketInstance);

      // ACT: Disconnect
      await connectionManager.disconnect(true);

      // BEHAVIOR VERIFICATION: Should clean up socket
      expect(mockSocketInstance.removeAllListeners).toHaveBeenCalled();
      expect(mockSocketInstance.disconnect).toHaveBeenCalled();
      expect(connectionManager.getSocket()).toBeNull();
    });
  });

  describe('Detailed Status Reporting', () => {
    it('should provide accurate detailed status', async () => {
      // ACT: Get initial status
      const initialStatus = connectionManager.getDetailedStatus();

      // ASSERT: Should provide comprehensive status
      expect(initialStatus).toMatchObject({
        state: 'DISCONNECTED',
        isConnected: false,
        socketId: undefined,
        socketConnected: false,
        currentAttempt: 0,
        manualDisconnect: false,
        isDestroyed: false,
        hasReconnectionTimer: false,
        options: expect.any(Object),
        metrics: expect.any(Object),
        health: expect.any(Object)
      });

      // ACT: Connect and check status
      await connectionManager.connect();
      await act(async () => {
        mockSocketInstance.connected = true;
        mockSocketInstance.id = 'connected-socket-id';
        const connectHandlers = eventEmitterSpy.get('connect') || [];
        connectHandlers.forEach(handler => handler());
      });

      const connectedStatus = connectionManager.getDetailedStatus();

      // ASSERT: Status should reflect connection
      expect(connectedStatus).toMatchObject({
        state: 'CONNECTED',
        isConnected: true,
        socketId: 'connected-socket-id',
        socketConnected: true
      });
    });
  });

  describe('Critical Connection State Consistency', () => {
    it('should maintain consistency between socket state and manager state', async () => {
      // ACT: Full connection flow
      await connectionManager.connect();
      
      await act(async () => {
        mockSocketInstance.connected = true;
        mockSocketInstance.disconnected = false;
        mockSocketInstance.id = 'consistent-socket';
        
        const connectHandlers = eventEmitterSpy.get('connect') || [];
        connectHandlers.forEach(handler => handler());
      });

      // ASSERT: All state indicators should be consistent
      expect(mockSocketInstance.connected).toBe(true);
      expect(connectionManager.isConnected()).toBe(true);
      expect(connectionManager.getState()).toBe('CONNECTED');
      
      const status = connectionManager.getDetailedStatus();
      expect(status.isConnected).toBe(true);
      expect(status.socketConnected).toBe(true);
      expect(status.state).toBe('CONNECTED');

      console.log('\n=== CONNECTION MANAGER STATE CONSISTENCY ===');
      console.log('Socket connected:', mockSocketInstance.connected);
      console.log('Manager isConnected():', connectionManager.isConnected());
      console.log('Manager getState():', connectionManager.getState());
      console.log('Status isConnected:', status.isConnected);
      console.log('Status socketConnected:', status.socketConnected);
      console.log('===========================================\n');
    });

    it('should detect inconsistencies between socket and manager state', async () => {
      // ARRANGE: Create inconsistent state (bug scenario)
      await connectionManager.connect();
      
      // Simulate socket being connected but manager not detecting it
      await act(async () => {
        mockSocketInstance.connected = true;
        mockSocketInstance.disconnected = false;
        // Don't trigger connect event - this simulates the bug
      });

      // ASSERT: This should show the inconsistency
      expect(mockSocketInstance.connected).toBe(true); // Socket says connected
      expect(connectionManager.isConnected()).toBe(false); // But manager says disconnected

      // DIAGNOSTIC: Log the inconsistency
      console.log('\n=== DETECTED INCONSISTENCY ===');
      console.log('Socket connected:', mockSocketInstance.connected);
      console.log('Manager isConnected:', connectionManager.isConnected());
      console.log('This indicates the manager is not properly detecting socket connection');
      console.log('=============================\n');
    });
  });

  describe('Connection Manager Integration with Hooks', () => {
    it('should be observable by external components via events', async () => {
      // ARRANGE: Simulate hook listening to manager events
      const mockHookStateUpdate = jest.fn();
      
      // Hook would listen to these events
      connectionManager.on('connected', mockHookStateUpdate);
      connectionManager.on('disconnected', mockHookStateUpdate);
      connectionManager.on('state_change', mockHookStateUpdate);

      // ACT: Connect
      await connectionManager.connect();
      await act(async () => {
        mockSocketInstance.connected = true;
        const connectHandlers = eventEmitterSpy.get('connect') || [];
        connectHandlers.forEach(handler => handler());
      });

      // BEHAVIOR VERIFICATION: Hook should receive events
      expect(mockHookStateUpdate).toHaveBeenCalled();

      // ACT: Disconnect
      await act(async () => {
        mockSocketInstance.connected = false;
        const disconnectHandlers = eventEmitterSpy.get('disconnect') || [];
        disconnectHandlers.forEach(handler => handler('manual'));
      });

      // BEHAVIOR VERIFICATION: Hook should receive disconnect event
      expect(mockHookStateUpdate).toHaveBeenCalledWith(expect.objectContaining({
        timestamp: expect.any(Date)
      }));
    });
  });
});