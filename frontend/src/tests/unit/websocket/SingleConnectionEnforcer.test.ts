/**
 * SingleConnectionEnforcer Test Suite - London School TDD
 * Tests single connection enforcement with focus on mock-driven development
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SingleConnectionEnforcer } from './SingleConnectionEnforcer';
import { ConnectionState } from '../../../types/connection';

// London School: Mock all collaborators
const mockConnectionRegistry = {
  getActiveConnection: jest.fn(),
  setActiveConnection: jest.fn(),
  removeConnection: jest.fn(),
  hasActiveConnection: jest.fn(),
  getConnectionCount: jest.fn(),
};

const mockConnectionCloser = {
  closeConnection: jest.fn(),
  closeAllConnections: jest.fn(),
  forceClose: jest.fn(),
};

const mockEventNotifier = {
  notifyConnectionReplaced: jest.fn(),
  notifyConnectionBlocked: jest.fn(),
  notifyConnectionEnforced: jest.fn(),
};

const mockLockManager = {
  acquireLock: jest.fn(),
  releaseLock: jest.fn(),
  isLocked: jest.fn(),
  waitForLock: jest.fn(),
};

describe('SingleConnectionEnforcer - London School TDD', () => {
  let enforcer: SingleConnectionEnforcer;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    enforcer = new SingleConnectionEnforcer({
      connectionRegistry: mockConnectionRegistry,
      connectionCloser: mockConnectionCloser,
      eventNotifier: mockEventNotifier,
      lockManager: mockLockManager,
    });
  });

  describe('Connection Enforcement Rules', () => {
    it('should allow first connection when no active connections exist', async () => {
      // London School: Set up mock expectations
      mockConnectionRegistry.hasActiveConnection.mockReturnValue(false);
      mockLockManager.acquireLock.mockResolvedValue(true);
      mockLockManager.isLocked.mockReturnValue(false);

      const connectionRequest = {
        terminalId: 'first-terminal',
        url: 'ws://test:3000/terminal/first',
        options: {}
      };

      // Act
      const result = await enforcer.enforceConnection(connectionRequest);

      // London School: Verify interactions
      expect(mockLockManager.acquireLock).toHaveBeenCalledWith('connection-lock');
      expect(mockConnectionRegistry.hasActiveConnection).toHaveBeenCalled();
      expect(mockConnectionRegistry.setActiveConnection).toHaveBeenCalledWith(
        'first-terminal',
        expect.objectContaining({
          terminalId: 'first-terminal',
          state: ConnectionState.CONNECTING
        })
      );
      expect(result.allowed).toBe(true);
      expect(result.replacedConnection).toBeNull();
    });

    it('should replace existing connection when new connection requested', async () => {
      // London School: Mock existing connection scenario
      const existingConnection = {
        terminalId: 'existing-terminal',
        state: ConnectionState.CONNECTED,
        websocket: { close: jest.fn() }
      };

      mockConnectionRegistry.hasActiveConnection.mockReturnValue(true);
      mockConnectionRegistry.getActiveConnection.mockReturnValue(existingConnection);
      mockLockManager.acquireLock.mockResolvedValue(true);
      mockConnectionCloser.closeConnection.mockResolvedValue(true);

      const newConnectionRequest = {
        terminalId: 'new-terminal',
        url: 'ws://test:3000/terminal/new',
        options: {}
      };

      // Act
      const result = await enforcer.enforceConnection(newConnectionRequest);

      // London School: Verify the conversation between objects
      expect(mockLockManager.acquireLock).toHaveBeenCalledWith('connection-lock');
      expect(mockConnectionCloser.closeConnection).toHaveBeenCalledWith(
        'existing-terminal',
        'Replaced by new connection'
      );
      expect(mockConnectionRegistry.removeConnection).toHaveBeenCalledWith('existing-terminal');
      expect(mockEventNotifier.notifyConnectionReplaced).toHaveBeenCalledWith({
        oldTerminalId: 'existing-terminal',
        newTerminalId: 'new-terminal'
      });
      expect(result.allowed).toBe(true);
      expect(result.replacedConnection?.terminalId).toBe('existing-terminal');
    });

    it('should reject connection when lock cannot be acquired', async () => {
      // London School: Mock lock acquisition failure
      mockLockManager.acquireLock.mockResolvedValue(false);
      mockLockManager.isLocked.mockReturnValue(true);

      const connectionRequest = {
        terminalId: 'blocked-terminal',
        url: 'ws://test:3000/terminal/blocked',
        options: { timeout: 1000 }
      };

      // Act
      const result = await enforcer.enforceConnection(connectionRequest);

      // London School: Verify lock interaction pattern
      expect(mockLockManager.acquireLock).toHaveBeenCalledWith('connection-lock');
      expect(mockEventNotifier.notifyConnectionBlocked).toHaveBeenCalledWith({
        terminalId: 'blocked-terminal',
        reason: 'Lock acquisition failed'
      });
      expect(mockConnectionRegistry.setActiveConnection).not.toHaveBeenCalled();
      expect(result.allowed).toBe(false);
      expect(result.blockReason).toBe('Lock acquisition failed');
    });

    it('should handle concurrent connection attempts with proper sequencing', async () => {
      // London School: Test race condition handling
      mockConnectionRegistry.hasActiveConnection
        .mockReturnValueOnce(false)  // First call - no connection
        .mockReturnValueOnce(true);  // Second call - connection exists

      mockLockManager.acquireLock
        .mockResolvedValueOnce(true)   // First request gets lock
        .mockResolvedValueOnce(false); // Second request fails to get lock

      mockLockManager.waitForLock
        .mockResolvedValue(true);

      const firstRequest = {
        terminalId: 'first-concurrent',
        url: 'ws://test:3000/terminal/1',
        options: {}
      };

      const secondRequest = {
        terminalId: 'second-concurrent',
        url: 'ws://test:3000/terminal/2',
        options: {}
      };

      // Act: Simulate concurrent requests
      const [firstResult, secondResult] = await Promise.all([
        enforcer.enforceConnection(firstRequest),
        enforcer.enforceConnection(secondRequest)
      ]);

      // London School: Verify lock coordination
      expect(mockLockManager.acquireLock).toHaveBeenCalledTimes(2);
      expect(firstResult.allowed).toBe(true);
      expect(secondResult.allowed).toBe(false);
      expect(mockEventNotifier.notifyConnectionEnforced).toHaveBeenCalledWith({
        acceptedTerminalId: 'first-concurrent',
        rejectedTerminalId: 'second-concurrent'
      });
    });
  });

  describe('Connection State Validation', () => {
    it('should validate connection state before enforcement', async () => {
      // London School: Mock state validation dependencies
      const mockValidator = {
        validateConnectionRequest: jest.fn(),
        isValidState: jest.fn(),
      };

      const enforcer = new SingleConnectionEnforcer({
        connectionRegistry: mockConnectionRegistry,
        connectionCloser: mockConnectionCloser,
        eventNotifier: mockEventNotifier,
        lockManager: mockLockManager,
        validator: mockValidator,
      });

      mockValidator.validateConnectionRequest.mockReturnValue({
        valid: false,
        errors: ['Invalid terminal ID format']
      });

      const invalidRequest = {
        terminalId: '', // Invalid empty ID
        url: 'ws://test:3000/terminal/',
        options: {}
      };

      // Act
      const result = await enforcer.enforceConnection(invalidRequest);

      // London School: Verify validation interaction
      expect(mockValidator.validateConnectionRequest).toHaveBeenCalledWith(invalidRequest);
      expect(result.allowed).toBe(false);
      expect(result.blockReason).toBe('Invalid terminal ID format');
      expect(mockLockManager.acquireLock).not.toHaveBeenCalled();
    });

    it('should check existing connection health before replacement', async () => {
      // London School: Mock health check collaborator
      const mockHealthChecker = {
        checkConnectionHealth: jest.fn(),
        isConnectionAlive: jest.fn(),
      };

      const existingConnection = {
        terminalId: 'existing-healthy',
        state: ConnectionState.CONNECTED,
        websocket: { readyState: 1 }
      };

      mockConnectionRegistry.hasActiveConnection.mockReturnValue(true);
      mockConnectionRegistry.getActiveConnection.mockReturnValue(existingConnection);
      mockLockManager.acquireLock.mockResolvedValue(true);
      mockHealthChecker.checkConnectionHealth.mockReturnValue({
        healthy: true,
        lastActivity: Date.now() - 1000
      });

      const enforcer = new SingleConnectionEnforcer({
        connectionRegistry: mockConnectionRegistry,
        connectionCloser: mockConnectionCloser,
        eventNotifier: mockEventNotifier,
        lockManager: mockLockManager,
        healthChecker: mockHealthChecker,
      });

      const newConnectionRequest = {
        terminalId: 'replacement-terminal',
        url: 'ws://test:3000/terminal/replacement',
        options: { forceReplace: false }
      };

      // Act
      await enforcer.enforceConnection(newConnectionRequest);

      // London School: Verify health check interaction
      expect(mockHealthChecker.checkConnectionHealth).toHaveBeenCalledWith(existingConnection);
      expect(mockEventNotifier.notifyConnectionReplaced).toHaveBeenCalledWith({
        oldTerminalId: 'existing-healthy',
        newTerminalId: 'replacement-terminal',
        healthStatus: { healthy: true, lastActivity: expect.any(Number) }
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle connection closing failures gracefully', async () => {
      // London School: Mock connection close failure
      const stubConnection = {
        terminalId: 'stubborn-connection',
        state: ConnectionState.CONNECTED,
        websocket: { close: jest.fn() }
      };

      mockConnectionRegistry.hasActiveConnection.mockReturnValue(true);
      mockConnectionRegistry.getActiveConnection.mockReturnValue(stubConnection);
      mockLockManager.acquireLock.mockResolvedValue(true);
      mockConnectionCloser.closeConnection.mockRejectedValue(
        new Error('Connection close timeout')
      );
      mockConnectionCloser.forceClose.mockResolvedValue(true);

      const newConnectionRequest = {
        terminalId: 'new-terminal',
        url: 'ws://test:3000/terminal/new',
        options: { forceReplace: true }
      };

      // Act
      const result = await enforcer.enforceConnection(newConnectionRequest);

      // London School: Verify error recovery interaction
      expect(mockConnectionCloser.closeConnection).toHaveBeenCalledWith(
        'stubborn-connection',
        'Replaced by new connection'
      );
      expect(mockConnectionCloser.forceClose).toHaveBeenCalledWith('stubborn-connection');
      expect(mockEventNotifier.notifyConnectionReplaced).toHaveBeenCalledWith({
        oldTerminalId: 'stubborn-connection',
        newTerminalId: 'new-terminal',
        forceReplaced: true
      });
      expect(result.allowed).toBe(true);
    });

    it('should clean up state when enforcement fails', async () => {
      // London School: Mock enforcement failure scenario
      mockLockManager.acquireLock.mockRejectedValue(new Error('Lock system failure'));
      
      const failedRequest = {
        terminalId: 'failed-terminal',
        url: 'ws://test:3000/terminal/failed',
        options: {}
      };

      // Act & Assert
      await expect(enforcer.enforceConnection(failedRequest)).rejects.toThrow('Lock system failure');

      // London School: Verify cleanup interactions
      expect(mockLockManager.releaseLock).toHaveBeenCalledWith('connection-lock');
      expect(mockEventNotifier.notifyConnectionBlocked).toHaveBeenCalledWith({
        terminalId: 'failed-terminal',
        reason: 'Enforcement system failure',
        error: expect.objectContaining({
          message: 'Lock system failure'
        })
      });
    });
  });

  describe('Lock Management Integration', () => {
    it('should coordinate with lock manager for atomic operations', async () => {
      // London School: Test lock lifecycle
      mockLockManager.acquireLock.mockResolvedValue(true);
      mockLockManager.isLocked.mockReturnValue(true);
      mockConnectionRegistry.hasActiveConnection.mockReturnValue(false);

      const connectionRequest = {
        terminalId: 'atomic-terminal',
        url: 'ws://test:3000/terminal/atomic',
        options: {}
      };

      // Act
      await enforcer.enforceConnection(connectionRequest);

      // London School: Verify lock coordination pattern
      const lockCalls = mockLockManager.acquireLock.mock.calls;
      const releaseCalls = mockLockManager.releaseLock.mock.calls;
      
      expect(lockCalls[0][0]).toBe('connection-lock');
      expect(releaseCalls[0][0]).toBe('connection-lock');
      
      // Verify lock was held during critical section
      expect(mockConnectionRegistry.setActiveConnection).toHaveBeenCalledAfter(
        mockLockManager.acquireLock
      );
      expect(mockLockManager.releaseLock).toHaveBeenCalledAfter(
        mockConnectionRegistry.setActiveConnection
      );
    });

    it('should handle lock timeout scenarios', async () => {
      // London School: Mock lock timeout behavior
      mockLockManager.acquireLock.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Lock timeout')), 100);
        });
      });

      const timedOutRequest = {
        terminalId: 'timeout-terminal',
        url: 'ws://test:3000/terminal/timeout',
        options: { lockTimeout: 50 }
      };

      // Act & Assert
      await expect(enforcer.enforceConnection(timedOutRequest)).rejects.toThrow('Lock timeout');

      // London School: Verify timeout handling
      expect(mockEventNotifier.notifyConnectionBlocked).toHaveBeenCalledWith({
        terminalId: 'timeout-terminal',
        reason: 'Lock acquisition timeout'
      });
    });
  });
});