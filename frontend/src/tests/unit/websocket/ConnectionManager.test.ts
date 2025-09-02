/**
 * ConnectionManager Test Suite - London School TDD
 * Tests WebSocket connection management with focus on interactions and behavior verification
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ConnectionManager } from './ConnectionManager';
import { MockWebSocket } from '../../mocks/MockWebSocket';
import { ConnectionState, ConnectionOptions } from '../../../types/connection';

// London School: Mock all collaborators to isolate unit under test
const mockEventEmitter = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  removeAllListeners: jest.fn(),
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

const mockConnectionStore = {
  getConnection: jest.fn(),
  setConnection: jest.fn(),
  removeConnection: jest.fn(),
  getAllConnections: jest.fn(),
  clear: jest.fn(),
};

const mockTimeoutManager = {
  setTimeout: jest.fn(),
  clearTimeout: jest.fn(),
  clearAll: jest.fn(),
};

describe('ConnectionManager - London School TDD', () => {
  let connectionManager: ConnectionManager;
  let mockWebSocketFactory: jest.MockedFunction<typeof MockWebSocket>;
  
  beforeEach(() => {
    // London School: Set up fresh mocks for each test
    jest.clearAllMocks();
    
    // Mock WebSocket constructor
    mockWebSocketFactory = jest.fn().mockImplementation((url: string) => {
      const mockWs = new MockWebSocket(url);
      return mockWs;
    });
    
    // Replace global WebSocket with our mock
    global.WebSocket = mockWebSocketFactory as any;
    
    connectionManager = new ConnectionManager({
      eventEmitter: mockEventEmitter,
      logger: mockLogger,
      connectionStore: mockConnectionStore,
      timeoutManager: mockTimeoutManager,
    });
  });
  
  afterEach(() => {
    connectionManager.disconnectAll();
  });

  describe('Single Connection Enforcement', () => {
    it('should disconnect existing connection before establishing new one', async () => {
      // London School: Define collaborator expectations
      const existingConnection = new MockWebSocket('ws://test:3000/terminal/existing');
      const newConnection = new MockWebSocket('ws://test:3000/terminal/new');
      
      mockConnectionStore.getConnection
        .mockReturnValueOnce(existingConnection)
        .mockReturnValueOnce(null);
      
      mockWebSocketFactory
        .mockReturnValueOnce(existingConnection)
        .mockReturnValueOnce(newConnection);

      // Act: Attempt to connect to new terminal while one exists
      await connectionManager.connect('existing-terminal');
      await connectionManager.connect('new-terminal');

      // London School: Verify interactions between collaborators
      expect(mockConnectionStore.removeConnection).toHaveBeenCalledWith('existing-terminal');
      expect(existingConnection.close).toHaveBeenCalledWith(1000, 'Replaced by new connection');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('connection:replaced', {
        oldTerminalId: 'existing-terminal',
        newTerminalId: 'new-terminal',
      });
    });

    it('should enforce only one active connection at a time', async () => {
      // London School: Focus on behavior verification
      mockConnectionStore.getAllConnections.mockReturnValue([]);
      
      const firstConnection = new MockWebSocket('ws://test:3000/terminal/first');
      const secondConnection = new MockWebSocket('ws://test:3000/terminal/second');
      
      mockWebSocketFactory
        .mockReturnValueOnce(firstConnection)
        .mockReturnValueOnce(secondConnection);

      // Act: Connect to first terminal
      await connectionManager.connect('first-terminal');
      
      // Verify single connection exists
      expect(mockConnectionStore.setConnection).toHaveBeenCalledWith(
        'first-terminal',
        expect.objectContaining({
          terminalId: 'first-terminal',
          state: ConnectionState.CONNECTED
        })
      );

      // Act: Connect to second terminal (should replace first)
      await connectionManager.connect('second-terminal');

      // London School: Verify the conversation between objects
      expect(mockConnectionStore.removeConnection).toHaveBeenCalledWith('first-terminal');
      expect(firstConnection.close).toHaveBeenCalled();
      expect(mockConnectionStore.setConnection).toHaveBeenCalledWith(
        'second-terminal',
        expect.objectContaining({
          terminalId: 'second-terminal',
          state: ConnectionState.CONNECTED
        })
      );
    });

    it('should prevent race conditions during concurrent connections', async () => {
      // London School: Test interaction patterns during race conditions
      const firstConnection = new MockWebSocket('ws://test:3000/terminal/first');
      const secondConnection = new MockWebSocket('ws://test:3000/terminal/second');
      
      mockWebSocketFactory
        .mockReturnValueOnce(firstConnection)
        .mockReturnValueOnce(secondConnection);

      // Act: Initiate concurrent connections
      const firstPromise = connectionManager.connect('first-terminal');
      const secondPromise = connectionManager.connect('second-terminal');

      await Promise.all([firstPromise, secondPromise]);

      // London School: Verify lock mechanism was engaged
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('connection:lock:acquired');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('connection:lock:released');
      
      // Verify only one connection succeeded
      const setConnectionCalls = mockConnectionStore.setConnection.mock.calls;
      expect(setConnectionCalls).toHaveLength(1);
    });
  });

  describe('Connection Lock Management', () => {
    it('should acquire lock before connection attempts', async () => {
      // London School: Verify lock acquisition behavior
      const mockConnection = new MockWebSocket('ws://test:3000/terminal/test');
      mockWebSocketFactory.mockReturnValue(mockConnection);

      await connectionManager.connect('test-terminal');

      // Verify lock interaction sequence
      const emitCalls = mockEventEmitter.emit.mock.calls;
      const lockAcquiredCall = emitCalls.find(call => call[0] === 'connection:lock:acquired');
      const lockReleasedCall = emitCalls.find(call => call[0] === 'connection:lock:released');
      
      expect(lockAcquiredCall).toBeDefined();
      expect(lockReleasedCall).toBeDefined();
    });

    it('should handle lock timeout scenarios', async () => {
      // London School: Mock timeout behavior
      mockTimeoutManager.setTimeout.mockImplementation((callback, delay) => {
        setTimeout(callback, delay);
        return 'timeout-id' as any;
      });

      const mockConnection = new MockWebSocket('ws://test:3000/terminal/test');
      mockWebSocketFactory.mockReturnValue(mockConnection);

      // Simulate lock held too long
      jest.useFakeTimers();
      
      const connectionPromise = connectionManager.connect('test-terminal', { 
        lockTimeout: 1000 
      });
      
      // Fast-forward past timeout
      jest.advanceTimersByTime(1500);
      
      await expect(connectionPromise).rejects.toThrow('Connection lock timeout');
      
      // Verify timeout was scheduled and cleared
      expect(mockTimeoutManager.setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('connection:lock:timeout');
      
      jest.useRealTimers();
    });

    it('should release lock on connection failure', async () => {
      // London School: Test error handling interactions
      const mockConnection = new MockWebSocket('ws://test:3000/terminal/test');
      mockConnection.addEventListener = jest.fn().mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Connection failed')), 10);
        }
      });
      
      mockWebSocketFactory.mockReturnValue(mockConnection);

      await expect(connectionManager.connect('test-terminal')).rejects.toThrow();

      // Verify lock was released even on failure
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('connection:lock:released');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('connection:error', {
        terminalId: 'test-terminal',
        error: expect.any(Error)
      });
    });
  });

  describe('Timeout Protection', () => {
    it('should apply connection timeout for hung connections', async () => {
      // London School: Mock slow connection scenario
      const mockConnection = new MockWebSocket('ws://test:3000/terminal/slow');
      
      // Mock connection that never opens
      mockConnection.addEventListener = jest.fn().mockImplementation((event, callback) => {
        // Don't call the open callback to simulate hung connection
      });
      
      mockWebSocketFactory.mockReturnValue(mockConnection);
      mockTimeoutManager.setTimeout.mockImplementation((callback, delay) => {
        setTimeout(callback, delay);
        return 'timeout-id' as any;
      });

      jest.useFakeTimers();
      
      const connectionPromise = connectionManager.connect('slow-terminal', { 
        connectionTimeout: 5000 
      });
      
      // Fast-forward past timeout
      jest.advanceTimersByTime(6000);
      
      await expect(connectionPromise).rejects.toThrow('Connection timeout');

      // Verify timeout handling
      expect(mockTimeoutManager.setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);
      expect(mockConnection.close).toHaveBeenCalledWith(1008, 'Connection timeout');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('connection:timeout', {
        terminalId: 'slow-terminal'
      });
      
      jest.useRealTimers();
    });

    it('should cancel timeout on successful connection', async () => {
      // London School: Verify timeout cleanup behavior
      const mockConnection = new MockWebSocket('ws://test:3000/terminal/fast');
      
      mockConnection.addEventListener = jest.fn().mockImplementation((event, callback) => {
        if (event === 'open') {
          setTimeout(callback, 100); // Quick connection
        }
      });
      
      mockWebSocketFactory.mockReturnValue(mockConnection);
      mockTimeoutManager.setTimeout.mockReturnValue('timeout-id');

      await connectionManager.connect('fast-terminal', { connectionTimeout: 5000 });

      // Verify timeout was cleared
      expect(mockTimeoutManager.clearTimeout).toHaveBeenCalledWith('timeout-id');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('connection:established', {
        terminalId: 'fast-terminal'
      });
    });

    it('should handle multiple timeout scenarios gracefully', async () => {
      // London School: Test complex timeout interactions
      const connection1 = new MockWebSocket('ws://test:3000/terminal/1');
      const connection2 = new MockWebSocket('ws://test:3000/terminal/2');
      
      mockWebSocketFactory
        .mockReturnValueOnce(connection1)
        .mockReturnValueOnce(connection2);
      
      mockTimeoutManager.setTimeout
        .mockReturnValueOnce('timeout-1')
        .mockReturnValueOnce('timeout-2');

      // Start two connections with different timeout behaviors
      const promise1 = connectionManager.connect('terminal-1', { connectionTimeout: 1000 });
      const promise2 = connectionManager.connect('terminal-2', { connectionTimeout: 2000 });

      jest.useFakeTimers();
      
      // Advance time to trigger first timeout
      jest.advanceTimersByTime(1500);
      
      await expect(promise1).rejects.toThrow('Connection timeout');
      
      // Second connection should still be pending
      jest.advanceTimersByTime(1000);
      
      await expect(promise2).rejects.toThrow('Connection timeout');

      // Verify both timeouts were managed
      expect(mockTimeoutManager.clearTimeout).toHaveBeenCalledWith('timeout-1');
      expect(mockTimeoutManager.clearTimeout).toHaveBeenCalledWith('timeout-2');
      
      jest.useRealTimers();
    });
  });

  describe('UI State Updates', () => {
    it('should emit correct state changes during connection lifecycle', async () => {
      // London School: Verify UI notification interactions
      const mockConnection = new MockWebSocket('ws://test:3000/terminal/ui');
      
      mockConnection.addEventListener = jest.fn().mockImplementation((event, callback) => {
        if (event === 'open') {
          setTimeout(() => callback(), 50);
        }
      });
      
      mockWebSocketFactory.mockReturnValue(mockConnection);

      await connectionManager.connect('ui-terminal');

      // Verify state change notifications
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('connection:state:changed', {
        terminalId: 'ui-terminal',
        state: ConnectionState.CONNECTING,
        previousState: ConnectionState.DISCONNECTED
      });
      
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('connection:state:changed', {
        terminalId: 'ui-terminal',
        state: ConnectionState.CONNECTED,
        previousState: ConnectionState.CONNECTING
      });
    });

    it('should notify UI of connection replacement events', async () => {
      // London School: Test UI interaction during connection replacement
      const oldConnection = new MockWebSocket('ws://test:3000/terminal/old');
      const newConnection = new MockWebSocket('ws://test:3000/terminal/new');
      
      mockConnectionStore.getConnection.mockReturnValueOnce(oldConnection);
      mockWebSocketFactory
        .mockReturnValueOnce(oldConnection)
        .mockReturnValueOnce(newConnection);

      // Connect first terminal
      await connectionManager.connect('old-terminal');
      
      // Replace with new terminal
      await connectionManager.connect('new-terminal');

      // Verify UI was notified of replacement
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('connection:replaced', {
        oldTerminalId: 'old-terminal',
        newTerminalId: 'new-terminal',
        timestamp: expect.any(Number)
      });
      
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('ui:connection:changed', {
        activeTerminalId: 'new-terminal',
        previousTerminalId: 'old-terminal'
      });
    });

    it('should provide connection health status for UI', async () => {
      // London School: Test health monitoring interactions
      const mockConnection = new MockWebSocket('ws://test:3000/terminal/health');
      mockWebSocketFactory.mockReturnValue(mockConnection);
      
      await connectionManager.connect('health-terminal');

      const healthStatus = connectionManager.getConnectionHealth('health-terminal');

      // Verify health status interaction
      expect(mockConnectionStore.getConnection).toHaveBeenCalledWith('health-terminal');
      expect(healthStatus).toEqual({
        terminalId: 'health-terminal',
        state: ConnectionState.CONNECTED,
        lastActivity: expect.any(Number),
        uptime: expect.any(Number),
        messageCount: 0
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle WebSocket creation failures gracefully', async () => {
      // London School: Test error collaboration patterns
      mockWebSocketFactory.mockImplementation(() => {
        throw new Error('WebSocket creation failed');
      });

      await expect(connectionManager.connect('failed-terminal')).rejects.toThrow();

      // Verify error handling interactions
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('connection:error', {
        terminalId: 'failed-terminal',
        error: expect.objectContaining({
          message: 'WebSocket creation failed'
        })
      });
      
      expect(mockConnectionStore.setConnection).not.toHaveBeenCalled();
    });

    it('should clean up resources on connection failure', async () => {
      // London School: Verify cleanup interactions
      const mockConnection = new MockWebSocket('ws://test:3000/terminal/cleanup');
      
      mockConnection.addEventListener = jest.fn().mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Network error')), 10);
        }
      });
      
      mockWebSocketFactory.mockReturnValue(mockConnection);

      await expect(connectionManager.connect('cleanup-terminal')).rejects.toThrow();

      // Verify cleanup interactions
      expect(mockConnectionStore.removeConnection).toHaveBeenCalledWith('cleanup-terminal');
      expect(mockTimeoutManager.clearAll).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('connection:cleanup', {
        terminalId: 'cleanup-terminal'
      });
    });
  });
});