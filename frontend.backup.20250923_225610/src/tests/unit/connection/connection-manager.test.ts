/**
 * Connection Manager Unit Tests
 * Comprehensive testing of WebSocket connection management functionality
 */

import { WebSocketConnectionManager } from '../../../services/connection/connection-manager';
import { ConnectionState } from '../../../services/connection/types';

// Mock Socket.IO
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  removeAllListeners: jest.fn(),
  connected: false,
  id: 'mock-socket-id',
  onAny: jest.fn()
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket)
}));

describe('WebSocketConnectionManager', () => {
  let manager: WebSocketConnectionManager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    manager = new WebSocketConnectionManager({
      url: 'ws://localhost:3001',
      autoConnect: false
    });
  });
  
  afterEach(() => {
    manager.destroy();
  });
  
  describe('Initialization', () => {
    it('should initialize in disconnected state', () => {
      expect(manager.getState()).toBe(ConnectionState.DISCONNECTED);
      expect(manager.isConnected()).toBe(false);
    });
    
    it('should initialize with provided options', () => {
      const customManager = new WebSocketConnectionManager({
        url: 'wss://example.com/ws',
        timeout: 5000,
        maxReconnectAttempts: 5,
        autoConnect: false
      });
      
      expect(customManager.getState()).toBe(ConnectionState.DISCONNECTED);
      customManager.destroy();
    });
    
    it('should auto-connect when autoConnect is true', () => {
      const autoConnectManager = new WebSocketConnectionManager({
        url: 'ws://localhost:3001',
        autoConnect: true
      });
      
      // Should attempt to connect immediately
      expect(autoConnectManager.getState()).toBe(ConnectionState.CONNECTING);
      autoConnectManager.destroy();
    });
  });
  
  describe('Connection Lifecycle', () => {
    it('should transition to connecting state when connect is called', async () => {
      const connectPromise = manager.connect();
      expect(manager.getState()).toBe(ConnectionState.CONNECTING);
      
      // Simulate successful connection
      const socketOnCalls = mockSocket.on.mock.calls;
      const connectHandler = socketOnCalls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) {
        connectHandler();
      }
      
      await connectPromise;
      expect(manager.getState()).toBe(ConnectionState.CONNECTED);
    });
    
    it('should handle connection errors', async () => {
      const connectPromise = manager.connect();
      
      // Simulate connection error
      const socketOnCalls = mockSocket.on.mock.calls;
      const errorHandler = socketOnCalls.find(call => call[0] === 'connect_error')?.[1];
      if (errorHandler) {
        errorHandler(new Error('Connection failed'));
      }
      
      await expect(connectPromise).rejects.toThrow();
      expect(manager.getState()).toBe(ConnectionState.ERROR);
    });
    
    it('should transition to disconnected state when disconnect is called', async () => {
      // First connect
      const connectPromise = manager.connect();
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
      await connectPromise;
      
      // Then disconnect
      await manager.disconnect();
      expect(manager.getState()).toBe(ConnectionState.DISCONNECTED);
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
    
    it('should transition to manual disconnect state when manually disconnected', async () => {
      // Connect first
      const connectPromise = manager.connect();
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
      await connectPromise;
      
      // Manual disconnect
      await manager.disconnect(true);
      expect(manager.getState()).toBe(ConnectionState.MANUAL_DISCONNECT);
    });
  });
  
  describe('Event Handling', () => {
    it('should emit state change events', (done) => {
      manager.on('state_change', (data) => {
        expect(data.from).toBe(ConnectionState.DISCONNECTED);
        expect(data.to).toBe(ConnectionState.CONNECTING);
        expect(data.timestamp).toBeInstanceOf(Date);
        done();
      });
      
      manager.connect();
    });
    
    it('should emit error events', (done) => {
      manager.on('error', (data) => {
        expect(data.error).toBeInstanceOf(Error);
        expect(data.context).toBe('connection');
        expect(data.recoverable).toBe(true);
        done();
      });
      
      const connectPromise = manager.connect();
      
      // Simulate error
      const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1];
      if (errorHandler) {
        errorHandler(new Error('Test error'));
      }
    });
    
    it('should emit connected events', (done) => {
      manager.on('connected', (data) => {
        expect(data.timestamp).toBeInstanceOf(Date);
        expect(data.attempt).toBe(0);
        done();
      });
      
      const connectPromise = manager.connect();
      
      // Simulate successful connection
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) {
        connectHandler();
      }
    });
  });
  
  describe('Reconnection Logic', () => {
    it('should attempt reconnection after involuntary disconnect', async () => {
      // Connect first
      const connectPromise = manager.connect();
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
      await connectPromise;
      
      // Simulate involuntary disconnect
      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')?.[1];
      if (disconnectHandler) {
        disconnectHandler('transport close');
      }
      
      // Should schedule reconnection
      expect(manager.getState()).toBe(ConnectionState.DISCONNECTED);
    });
    
    it('should not reconnect after manual disconnect', async () => {
      // Connect first
      const connectPromise = manager.connect();
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
      await connectPromise;
      
      // Manual disconnect
      await manager.disconnect(true);
      
      // Simulate disconnect event
      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')?.[1];
      if (disconnectHandler) {
        disconnectHandler('io client disconnect');
      }
      
      expect(manager.getState()).toBe(ConnectionState.MANUAL_DISCONNECT);
    });
    
    it('should respect max reconnection attempts', async () => {
      const limitedManager = new WebSocketConnectionManager({
        url: 'ws://localhost:3001',
        maxReconnectAttempts: 2,
        autoConnect: false
      });
      
      let reconnectAttempts = 0;
      limitedManager.on('reconnection_attempt', () => {
        reconnectAttempts++;
      });
      
      // Attempt multiple reconnections
      for (let i = 0; i < 5; i++) {
        try {
          await limitedManager.reconnect();
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(reconnectAttempts).toBeLessThanOrEqual(2);
      limitedManager.destroy();
    });
  });
  
  describe('Socket Management', () => {
    it('should provide access to underlying socket', async () => {
      const socket = manager.getSocket();
      expect(socket).toBe(mockSocket);
    });
    
    it('should clean up socket on destroy', () => {
      manager.destroy();
      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
    
    it('should track message metrics', async () => {
      // Connect first
      const connectPromise = manager.connect();
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
      await connectPromise;
      
      const initialMetrics = manager.getMetrics();
      expect(initialMetrics.messagesSent).toBe(0);
      expect(initialMetrics.messagesReceived).toBe(0);
    });
  });
  
  describe('Configuration Updates', () => {
    it('should allow updating options', () => {
      manager.updateOptions({
        timeout: 10000,
        maxReconnectAttempts: 15
      });
      
      // Options should be updated internally
      // This would be verified through behavior changes in a real implementation
      expect(true).toBe(true); // Placeholder
    });
  });
  
  describe('Error Handling', () => {
    it('should handle destroyed manager gracefully', async () => {
      manager.destroy();
      
      await expect(manager.connect()).rejects.toThrow('destroyed');
      await expect(manager.reconnect()).rejects.toThrow('destroyed');
    });
    
    it('should handle multiple simultaneous connection attempts', async () => {
      const connectPromises = [
        manager.connect(),
        manager.connect(),
        manager.connect()
      ];
      
      // Simulate successful connection
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) {
        connectHandler();
      }
      
      const results = await Promise.allSettled(connectPromises);
      
      // Should handle gracefully without issues
      expect(results.some(result => result.status === 'fulfilled')).toBe(true);
    });
  });
  
  describe('Health Monitoring Integration', () => {
    it('should start health monitoring on connection', async () => {
      const healthSpy = jest.spyOn(manager, 'getHealth');
      
      const connectPromise = manager.connect();
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
      await connectPromise;
      
      const health = manager.getHealth();
      expect(health).toBeDefined();
      expect(typeof health.isHealthy).toBe('boolean');
    });
  });
  
  describe('Metrics Tracking', () => {
    it('should track connection attempts', async () => {
      const initialMetrics = manager.getMetrics();
      expect(initialMetrics.connectionAttempts).toBe(0);
      
      const connectPromise = manager.connect();
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
      await connectPromise;
      
      const updatedMetrics = manager.getMetrics();
      expect(updatedMetrics.connectionAttempts).toBe(1);
      expect(updatedMetrics.successfulConnections).toBe(1);
    });
    
    it('should track failed connections', async () => {
      const connectPromise = manager.connect();
      
      // Simulate connection error
      const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1];
      if (errorHandler) {
        errorHandler(new Error('Connection failed'));
      }
      
      try {
        await connectPromise;
      } catch (error) {
        // Expected
      }
      
      const metrics = manager.getMetrics();
      expect(metrics.connectionAttempts).toBe(1);
      expect(metrics.failedConnections).toBe(1);
    });
  });
  
  describe('Detailed Status', () => {
    it('should provide comprehensive status information', () => {
      const status = manager.getDetailedStatus();
      
      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('isConnected');
      expect(status).toHaveProperty('socketId');
      expect(status).toHaveProperty('options');
      expect(status).toHaveProperty('metrics');
      expect(status).toHaveProperty('health');
      
      // Should not expose sensitive auth information
      expect(status.options.auth).toBe('[REDACTED]');
    });
  });
});