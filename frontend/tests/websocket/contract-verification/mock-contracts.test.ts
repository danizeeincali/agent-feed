/**
 * TDD London School Contract Verification Tests
 * Verify mock contracts match real implementations and behavior expectations
 */

import { MockSocket, mockScenarios } from '../mocks/socket-io-mock';
import { MockWebSocketConnectionManager, createMockConnectionManager } from '../mocks/connection-manager-mock';
import { ConnectionState } from '../../../src/services/connection/types';

describe('TDD London School: Mock Contract Verification', () => {
  
  describe('Socket.IO Mock Contract', () => {
    let mockSocket: MockSocket;
    
    beforeEach(() => {
      mockSocket = mockScenarios.disconnectedSocket();
    });
    
    afterEach(() => {
      mockSocket.destroy();
    });
    
    it('should implement Socket.IO event interface correctly', () => {
      // Verify mock implements expected Socket.IO interface
      expect(mockSocket).toHaveProperty('id');
      expect(mockSocket).toHaveProperty('connected');
      expect(mockSocket).toHaveProperty('connecting');
      expect(mockSocket).toHaveProperty('disconnected');
      expect(mockSocket).toHaveProperty('emit');
      expect(mockSocket).toHaveProperty('on');
      expect(mockSocket).toHaveProperty('off');
      expect(mockSocket).toHaveProperty('once');
      expect(mockSocket).toHaveProperty('connect');
      expect(mockSocket).toHaveProperty('disconnect');
      
      // Verify methods are functions
      expect(typeof mockSocket.emit).toBe('function');
      expect(typeof mockSocket.on).toBe('function');
      expect(typeof mockSocket.off).toBe('function');
      expect(typeof mockSocket.connect).toBe('function');
      expect(typeof mockSocket.disconnect).toBe('function');
    });
    
    it('should track event emissions for verification', () => {
      const eventData = { test: 'data' };
      
      mockSocket.emit('test_event', eventData);
      
      const emittedEvents = mockSocket.getEmittedEvents();
      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0]).toMatchObject({
        event: 'test_event',
        data: [eventData],
        timestamp: expect.any(Number)
      });
    });
    
    it('should track event listeners for verification', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      mockSocket.on('test_event', handler1);
      mockSocket.on('test_event', handler2);
      mockSocket.on('other_event', handler1);
      
      expect(mockSocket.getListenersFor('test_event')).toHaveLength(2);
      expect(mockSocket.getListenersFor('other_event')).toHaveLength(1);
      expect(mockSocket.getListenersFor('nonexistent_event')).toHaveLength(0);
    });
    
    it('should simulate connection lifecycle correctly', async () => {
      expect(mockSocket.connected).toBe(false);
      expect(mockSocket.disconnected).toBe(true);
      
      // Track connect event
      const connectHandler = jest.fn();
      mockSocket.on('connect', connectHandler);
      
      // Initiate connection
      mockSocket.connect();
      expect(mockSocket.connecting).toBe(true);
      
      // Wait for connection to complete
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(mockSocket.connected).toBe(true);
      expect(mockSocket.connecting).toBe(false);
      expect(mockSocket.disconnected).toBe(false);
      expect(connectHandler).toHaveBeenCalled();
    });
    
    it('should simulate connection failures', async () => {
      const failingSocket = new MockSocket({
        shouldFailConnection: true,
        failureReason: 'Network error'
      });
      
      const errorHandler = jest.fn();
      failingSocket.on('connect_error', errorHandler);
      
      failingSocket.connect();
      
      // Wait for failure
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(failingSocket.connected).toBe(false);
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
      
      failingSocket.destroy();
    });
    
    it('should simulate disconnect lifecycle', () => {
      const connectedSocket = mockScenarios.connectedSocket();
      const disconnectHandler = jest.fn();
      
      connectedSocket.on('disconnect', disconnectHandler);
      connectedSocket.disconnect();
      
      expect(connectedSocket.connected).toBe(false);
      expect(connectedSocket.disconnected).toBe(true);
      
      // Disconnect event should be emitted asynchronously
      return new Promise(resolve => {
        process.nextTick(() => {
          expect(disconnectHandler).toHaveBeenCalledWith('io client disconnect');
          connectedSocket.destroy();
          resolve(undefined);
        });
      });
    });
    
    it('should support forced state changes for race condition testing', () => {
      mockSocket.forceState({
        connected: true,
        connecting: false,
        disconnected: false
      });
      
      expect(mockSocket.connected).toBe(true);
      expect(mockSocket.connecting).toBe(false);
      expect(mockSocket.disconnected).toBe(false);
    });
    
    it('should simulate race condition scenarios', () => {
      const raceSocket = mockScenarios.raceConditionSocket();
      
      // Should be in the race condition state
      expect(raceSocket.connected).toBe(false);
      expect(raceSocket.disconnected).toBe(false);
      
      raceSocket.destroy();
    });
  });
  
  describe('Connection Manager Mock Contract', () => {
    let mockManager: MockWebSocketConnectionManager;
    
    beforeEach(() => {
      mockManager = createMockConnectionManager.disconnected();
    });
    
    afterEach(() => {
      mockManager.destroy();
    });
    
    it('should implement ConnectionManager interface correctly', () => {
      // Verify all required methods exist
      expect(typeof mockManager.connect).toBe('function');
      expect(typeof mockManager.disconnect).toBe('function');
      expect(typeof mockManager.reconnect).toBe('function');
      expect(typeof mockManager.getState).toBe('function');
      expect(typeof mockManager.getMetrics).toBe('function');
      expect(typeof mockManager.getHealth).toBe('function');
      expect(typeof mockManager.isConnected).toBe('function');
      expect(typeof mockManager.getSocket).toBe('function');
      expect(typeof mockManager.on).toBe('function');
      expect(typeof mockManager.off).toBe('function');
      expect(typeof mockManager.emit).toBe('function');
      expect(typeof mockManager.updateOptions).toBe('function');
      expect(typeof mockManager.destroy).toBe('function');
    });
    
    it('should track method call counts for verification', async () => {
      expect(mockManager.getConnectCallCount()).toBe(0);
      expect(mockManager.getDisconnectCallCount()).toBe(0);
      expect(mockManager.getReconnectCallCount()).toBe(0);
      
      await mockManager.connect();
      expect(mockManager.getConnectCallCount()).toBe(1);
      
      await mockManager.disconnect();
      expect(mockManager.getDisconnectCallCount()).toBe(1);
      
      try {
        await mockManager.reconnect();
      } catch {
        // Ignore reconnect failures for this test
      }
      expect(mockManager.getReconnectCallCount()).toBe(1);
    });
    
    it('should track state history for verification', async () => {
      const initialHistory = mockManager.getStateHistory();
      expect(initialHistory).toHaveLength(0);
      
      await mockManager.connect();
      
      const historyAfterConnect = mockManager.getStateHistory();
      expect(historyAfterConnect.length).toBeGreaterThan(0);
      
      // Should track state transitions
      const lastTransition = historyAfterConnect[historyAfterConnect.length - 1];
      expect(lastTransition).toMatchObject({
        from: expect.any(String),
        to: ConnectionState.CONNECTED,
        timestamp: expect.any(Number)
      });
    });
    
    it('should emit expected events during lifecycle', async () => {
      const stateChangeHandler = jest.fn();
      const connectedHandler = jest.fn();
      const disconnectedHandler = jest.fn();
      
      mockManager.on('state_change', stateChangeHandler);
      mockManager.on('connected', connectedHandler);
      mockManager.on('disconnected', disconnectedHandler);
      
      await mockManager.connect();
      
      expect(stateChangeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          from: ConnectionState.DISCONNECTED,
          to: ConnectionState.CONNECTED
        })
      );
      expect(connectedHandler).toHaveBeenCalled();
      
      await mockManager.disconnect();
      
      expect(disconnectedHandler).toHaveBeenCalled();
    });
    
    it('should implement isConnected race condition logic correctly', () => {
      const raceManager = createMockConnectionManager.raceCondition();
      
      // Manager state is CONNECTED but socket is not connected
      expect(raceManager.getState()).toBe(ConnectionState.CONNECTED);
      expect(raceManager.getSocket()?.connected).toBe(false);
      expect(raceManager.isConnected()).toBe(false); // Should detect race condition
      
      raceManager.destroy();
    });
    
    it('should return valid metrics and health data', () => {
      const metrics = mockManager.getMetrics();
      const health = mockManager.getHealth();
      
      // Verify metrics structure
      expect(metrics).toMatchObject({
        connectionAttempts: expect.any(Number),
        successfulConnections: expect.any(Number),
        failedConnections: expect.any(Number),
        reconnectionAttempts: expect.any(Number),
        totalDowntime: expect.any(Number),
        averageLatency: expect.any(Number),
        lastConnectionTime: expect.any(Date),
        lastDisconnectionTime: expect.any(Date),
        lastDisconnectionReason: null,
        bytesReceived: expect.any(Number),
        bytesSent: expect.any(Number),
        messagesReceived: expect.any(Number),
        messagesSent: expect.any(Number)
      });
      
      // Verify health structure
      expect(health).toMatchObject({
        isHealthy: expect.any(Boolean),
        latency: expect.any(Number),
        lastPing: expect.any(Date),
        consecutiveFailures: expect.any(Number),
        uptime: expect.any(Number),
        serverTimestamp: expect.any(Date),
        networkQuality: expect.any(String)
      });
    });
    
    it('should support forced state changes for testing', () => {
      expect(mockManager.getState()).toBe(ConnectionState.DISCONNECTED);
      
      mockManager.forceState(ConnectionState.CONNECTED);
      expect(mockManager.getState()).toBe(ConnectionState.CONNECTED);
      
      mockManager.forceSocketState({ connected: true });
      expect(mockManager.getSocket()?.connected).toBe(true);
    });
    
    it('should handle connection failures appropriately', async () => {
      const errorManager = createMockConnectionManager.disconnected({
        url: 'http://localhost:3001'
      }, {
        shouldFailConnection: true
      });
      
      const errorHandler = jest.fn();
      errorManager.on('error', errorHandler);
      
      await expect(errorManager.connect()).rejects.toThrow('Mock connection failed');
      expect(errorHandler).toHaveBeenCalled();
      
      errorManager.destroy();
    });
  });
  
  describe('Mock Factory Scenarios', () => {
    it('should create consistent disconnected scenarios', () => {
      const socket = mockScenarios.disconnectedSocket();
      const manager = createMockConnectionManager.disconnected();
      
      expect(socket.connected).toBe(false);
      expect(socket.disconnected).toBe(true);
      expect(manager.getState()).toBe(ConnectionState.DISCONNECTED);
      expect(manager.isConnected()).toBe(false);
      
      socket.destroy();
      manager.destroy();
    });
    
    it('should create consistent connected scenarios', () => {
      const socket = mockScenarios.connectedSocket();
      const manager = createMockConnectionManager.connected();
      
      expect(socket.connected).toBe(true);
      expect(socket.disconnected).toBe(false);
      expect(manager.getState()).toBe(ConnectionState.CONNECTED);
      expect(manager.isConnected()).toBe(true);
      
      socket.destroy();
      manager.destroy();
    });
    
    it('should create consistent connecting scenarios', () => {
      const socket = mockScenarios.connectingSocket();
      const manager = createMockConnectionManager.connecting();
      
      expect(socket.connected).toBe(false);
      expect(socket.connecting).toBe(true);
      expect(manager.getState()).toBe(ConnectionState.CONNECTING);
      expect(manager.isConnected()).toBe(false);
      
      socket.destroy();
      manager.destroy();
    });
    
    it('should create consistent error scenarios', () => {
      const socket = mockScenarios.failedConnection();
      const manager = createMockConnectionManager.error();
      
      expect(manager.getState()).toBe(ConnectionState.ERROR);
      expect(manager.isConnected()).toBe(false);
      
      socket.destroy();
      manager.destroy();
    });
    
    it('should create consistent race condition scenarios', () => {
      const socket = mockScenarios.raceConditionSocket();
      const manager = createMockConnectionManager.raceCondition();
      
      // Both should be in race condition state
      expect(socket.connected).toBe(false);
      expect(socket.disconnected).toBe(false);
      expect(manager.getState()).toBe(ConnectionState.CONNECTED);
      expect(manager.getSocket()?.connected).toBe(false);
      expect(manager.isConnected()).toBe(false); // Race condition detected
      
      socket.destroy();
      manager.destroy();
    });
  });
  
  describe('Mock Interaction Verification', () => {
    it('should verify socket-manager interaction contracts', async () => {
      const mockSocket = mockScenarios.disconnectedSocket();
      const mockManager = createMockConnectionManager.disconnected();
      
      // Set up the socket in the manager
      mockManager.forceSocketState({ connected: false });
      
      // Verify manager uses socket state in isConnected calculation
      expect(mockManager.isConnected()).toBe(false);
      
      // Simulate successful connection
      await mockManager.connect();
      mockSocket.forceState({ connected: true });
      mockManager.forceSocketState({ connected: true });
      
      expect(mockManager.isConnected()).toBe(true);
      
      mockSocket.destroy();
      mockManager.destroy();
    });
    
    it('should verify event propagation contracts', async () => {
      const mockManager = createMockConnectionManager.disconnected();
      const eventHandler = jest.fn();
      
      mockManager.on('state_change', eventHandler);
      
      await mockManager.connect();
      
      // Verify event was emitted with correct structure
      expect(eventHandler).toHaveBeenCalledWith({
        from: ConnectionState.DISCONNECTED,
        to: ConnectionState.CONNECTED,
        timestamp: expect.any(Date)
      });
      
      mockManager.destroy();
    });
    
    it('should verify cleanup contracts', () => {
      const mockSocket = mockScenarios.connectedSocket();
      const mockManager = createMockConnectionManager.connected();
      
      const socketDestroySpy = jest.spyOn(mockSocket, 'destroy');
      
      // Manager should clean up socket when destroyed
      mockManager.destroy();
      
      // Socket cleanup should be called
      expect(socketDestroySpy).toHaveBeenCalled();
    });
  });
  
  describe('Mock Behavior Consistency', () => {
    it('should maintain consistent behavior across multiple instances', () => {
      const socket1 = mockScenarios.disconnectedSocket();
      const socket2 = mockScenarios.disconnectedSocket();
      const manager1 = createMockConnectionManager.disconnected();
      const manager2 = createMockConnectionManager.disconnected();
      
      // All instances should behave identically
      expect(socket1.connected).toBe(socket2.connected);
      expect(socket1.disconnected).toBe(socket2.disconnected);
      expect(manager1.getState()).toBe(manager2.getState());
      expect(manager1.isConnected()).toBe(manager2.isConnected());
      
      socket1.destroy();
      socket2.destroy();
      manager1.destroy();
      manager2.destroy();
    });
    
    it('should maintain state consistency during rapid changes', async () => {
      const mockManager = createMockConnectionManager.disconnected();
      
      // Rapid state changes
      for (let i = 0; i < 10; i++) {
        await mockManager.connect();
        expect(mockManager.getState()).toBe(ConnectionState.CONNECTED);
        
        await mockManager.disconnect();
        expect(mockManager.getState()).toBe(ConnectionState.DISCONNECTED);
      }
      
      mockManager.destroy();
    });
  });
});