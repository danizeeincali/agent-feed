/**
 * ConnectionStateMachine Test Suite - London School TDD
 * Tests state transitions and behavior verification with mocked collaborators
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ConnectionStateMachine } from './ConnectionStateMachine';
import { ConnectionState, StateTransition } from '../../../types/connection';

// London School: Mock all state machine collaborators
const mockStateStore = {
  getCurrentState: jest.fn(),
  setState: jest.fn(),
  getStateHistory: jest.fn(),
  clearHistory: jest.fn(),
};

const mockTransitionValidator = {
  isValidTransition: jest.fn(),
  getValidTransitions: jest.fn(),
  validateTransitionData: jest.fn(),
};

const mockStateEventEmitter = {
  emit: jest.fn(),
  emitStateChange: jest.fn(),
  emitTransitionStarted: jest.fn(),
  emitTransitionCompleted: jest.fn(),
  emitTransitionFailed: jest.fn(),
};

const mockConnectionContext = {
  terminalId: 'test-terminal',
  websocket: null,
  lastActivity: Date.now(),
  metadata: {}
};

describe('ConnectionStateMachine - London School TDD', () => {
  let stateMachine: ConnectionStateMachine;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    stateMachine = new ConnectionStateMachine({
      context: mockConnectionContext,
      stateStore: mockStateStore,
      transitionValidator: mockTransitionValidator,
      eventEmitter: mockStateEventEmitter,
    });
  });

  describe('State Transition Management', () => {
    it('should perform valid state transitions with proper collaboration', async () => {
      // London School: Set up mock expectations for valid transition
      mockStateStore.getCurrentState.mockReturnValue(ConnectionState.DISCONNECTED);
      mockTransitionValidator.isValidTransition.mockReturnValue(true);
      mockTransitionValidator.validateTransitionData.mockReturnValue({ valid: true });

      const transition: StateTransition = {
        from: ConnectionState.DISCONNECTED,
        to: ConnectionState.CONNECTING,
        trigger: 'connect_requested',
        data: { terminalId: 'test-terminal' }
      };

      // Act
      const result = await stateMachine.transition(transition);

      // London School: Verify interactions between collaborators
      expect(mockTransitionValidator.isValidTransition).toHaveBeenCalledWith(
        ConnectionState.DISCONNECTED,
        ConnectionState.CONNECTING
      );
      expect(mockStateEventEmitter.emitTransitionStarted).toHaveBeenCalledWith(transition);
      expect(mockStateStore.setState).toHaveBeenCalledWith(ConnectionState.CONNECTING);
      expect(mockStateEventEmitter.emitStateChange).toHaveBeenCalledWith({
        from: ConnectionState.DISCONNECTED,
        to: ConnectionState.CONNECTING,
        context: mockConnectionContext
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid state transitions', async () => {
      // London School: Mock invalid transition scenario
      mockStateStore.getCurrentState.mockReturnValue(ConnectionState.CONNECTED);
      mockTransitionValidator.isValidTransition.mockReturnValue(false);
      mockTransitionValidator.getValidTransitions.mockReturnValue([
        ConnectionState.DISCONNECTING,
        ConnectionState.ERROR
      ]);

      const invalidTransition: StateTransition = {
        from: ConnectionState.CONNECTED,
        to: ConnectionState.CONNECTING, // Invalid: can't go from connected to connecting
        trigger: 'invalid_trigger',
        data: {}
      };

      // Act
      const result = await stateMachine.transition(invalidTransition);

      // London School: Verify rejection interaction pattern
      expect(mockTransitionValidator.isValidTransition).toHaveBeenCalledWith(
        ConnectionState.CONNECTED,
        ConnectionState.CONNECTING
      );
      expect(mockStateEventEmitter.emitTransitionFailed).toHaveBeenCalledWith({
        transition: invalidTransition,
        reason: 'Invalid state transition',
        validStates: [ConnectionState.DISCONNECTING, ConnectionState.ERROR]
      });
      expect(mockStateStore.setState).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    it('should handle connection establishment workflow', async () => {
      // London School: Test complete connection workflow
      mockStateStore.getCurrentState
        .mockReturnValueOnce(ConnectionState.DISCONNECTED)  // Initial state
        .mockReturnValueOnce(ConnectionState.CONNECTING)     // After first transition
        .mockReturnValueOnce(ConnectionState.CONNECTED);     // After second transition

      mockTransitionValidator.isValidTransition.mockReturnValue(true);
      mockTransitionValidator.validateTransitionData.mockReturnValue({ valid: true });

      // Act: Execute connection workflow
      const connectingResult = await stateMachine.transition({
        from: ConnectionState.DISCONNECTED,
        to: ConnectionState.CONNECTING,
        trigger: 'connect_requested',
        data: { url: 'ws://test:3000' }
      });

      const connectedResult = await stateMachine.transition({
        from: ConnectionState.CONNECTING,
        to: ConnectionState.CONNECTED,
        trigger: 'websocket_opened',
        data: { websocket: { readyState: 1 } }
      });

      // London School: Verify workflow coordination
      expect(mockStateEventEmitter.emitTransitionStarted).toHaveBeenCalledTimes(2);
      expect(mockStateStore.setState).toHaveBeenNthCalledWith(1, ConnectionState.CONNECTING);
      expect(mockStateStore.setState).toHaveBeenNthCalledWith(2, ConnectionState.CONNECTED);
      expect(connectingResult.success).toBe(true);
      expect(connectedResult.success).toBe(true);
    });

    it('should handle connection failure scenarios', async () => {
      // London School: Mock connection failure workflow
      mockStateStore.getCurrentState
        .mockReturnValueOnce(ConnectionState.CONNECTING)
        .mockReturnValueOnce(ConnectionState.ERROR);

      mockTransitionValidator.isValidTransition.mockReturnValue(true);
      mockTransitionValidator.validateTransitionData.mockReturnValue({ valid: true });

      const failureTransition: StateTransition = {
        from: ConnectionState.CONNECTING,
        to: ConnectionState.ERROR,
        trigger: 'websocket_error',
        data: { error: 'Connection failed', code: 1006 }
      };

      // Act
      const result = await stateMachine.transition(failureTransition);

      // London School: Verify error handling interactions
      expect(mockStateEventEmitter.emitTransitionStarted).toHaveBeenCalledWith(failureTransition);
      expect(mockStateStore.setState).toHaveBeenCalledWith(ConnectionState.ERROR);
      expect(mockStateEventEmitter.emitStateChange).toHaveBeenCalledWith({
        from: ConnectionState.CONNECTING,
        to: ConnectionState.ERROR,
        context: expect.objectContaining({
          error: 'Connection failed',
          code: 1006
        })
      });
      expect(result.success).toBe(true);
    });
  });

  describe('State Validation and Guards', () => {
    it('should validate transition data before executing', async () => {
      // London School: Mock data validation failure
      mockStateStore.getCurrentState.mockReturnValue(ConnectionState.DISCONNECTED);
      mockTransitionValidator.isValidTransition.mockReturnValue(true);
      mockTransitionValidator.validateTransitionData.mockReturnValue({
        valid: false,
        errors: ['Missing required terminalId']
      });

      const invalidDataTransition: StateTransition = {
        from: ConnectionState.DISCONNECTED,
        to: ConnectionState.CONNECTING,
        trigger: 'connect_requested',
        data: {} // Missing terminalId
      };

      // Act
      const result = await stateMachine.transition(invalidDataTransition);

      // London School: Verify validation interaction
      expect(mockTransitionValidator.validateTransitionData).toHaveBeenCalledWith(
        invalidDataTransition.data,
        ConnectionState.CONNECTING
      );
      expect(mockStateEventEmitter.emitTransitionFailed).toHaveBeenCalledWith({
        transition: invalidDataTransition,
        reason: 'Invalid transition data',
        errors: ['Missing required terminalId']
      });
      expect(result.success).toBe(false);
    });

    it('should apply state guards for conditional transitions', async () => {
      // London School: Mock guard conditions
      const mockGuard = {
        canEnterConnecting: jest.fn(),
        canEnterConnected: jest.fn(),
      };

      const stateMachine = new ConnectionStateMachine({
        context: mockConnectionContext,
        stateStore: mockStateStore,
        transitionValidator: mockTransitionValidator,
        eventEmitter: mockStateEventEmitter,
        guards: mockGuard,
      });

      mockStateStore.getCurrentState.mockReturnValue(ConnectionState.DISCONNECTED);
      mockTransitionValidator.isValidTransition.mockReturnValue(true);
      mockTransitionValidator.validateTransitionData.mockReturnValue({ valid: true });
      mockGuard.canEnterConnecting.mockReturnValue(false); // Guard blocks transition

      const guardedTransition: StateTransition = {
        from: ConnectionState.DISCONNECTED,
        to: ConnectionState.CONNECTING,
        trigger: 'connect_requested',
        data: { terminalId: 'test-terminal' }
      };

      // Act
      const result = await stateMachine.transition(guardedTransition);

      // London School: Verify guard interaction
      expect(mockGuard.canEnterConnecting).toHaveBeenCalledWith(mockConnectionContext);
      expect(mockStateEventEmitter.emitTransitionFailed).toHaveBeenCalledWith({
        transition: guardedTransition,
        reason: 'Guard condition failed'
      });
      expect(mockStateStore.setState).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    it('should handle concurrent state change attempts', async () => {
      // London School: Mock concurrent transition scenario
      mockStateStore.getCurrentState
        .mockReturnValueOnce(ConnectionState.DISCONNECTED)  // First call
        .mockReturnValueOnce(ConnectionState.CONNECTING);    // Second call (state changed)

      mockTransitionValidator.isValidTransition
        .mockReturnValueOnce(true)   // First transition valid
        .mockReturnValueOnce(false); // Second transition invalid due to state change

      const firstTransition: StateTransition = {
        from: ConnectionState.DISCONNECTED,
        to: ConnectionState.CONNECTING,
        trigger: 'connect_requested',
        data: { terminalId: 'terminal-1' }
      };

      const secondTransition: StateTransition = {
        from: ConnectionState.DISCONNECTED, // Stale state
        to: ConnectionState.CONNECTING,
        trigger: 'connect_requested',
        data: { terminalId: 'terminal-2' }
      };

      // Act: Simulate concurrent transitions
      const [firstResult, secondResult] = await Promise.all([
        stateMachine.transition(firstTransition),
        stateMachine.transition(secondTransition)
      ]);

      // London School: Verify concurrency handling
      expect(mockTransitionValidator.isValidTransition).toHaveBeenCalledWith(
        ConnectionState.DISCONNECTED,
        ConnectionState.CONNECTING
      );
      expect(firstResult.success).toBe(true);
      expect(secondResult.success).toBe(false);
      expect(mockStateEventEmitter.emitTransitionFailed).toHaveBeenCalledWith({
        transition: secondTransition,
        reason: 'State changed during transition'
      });
    });
  });

  describe('State History and Tracking', () => {
    it('should maintain state transition history', async () => {
      // London School: Mock history tracking
      mockStateStore.getCurrentState.mockReturnValue(ConnectionState.DISCONNECTED);
      mockTransitionValidator.isValidTransition.mockReturnValue(true);
      mockTransitionValidator.validateTransitionData.mockReturnValue({ valid: true });

      const transition: StateTransition = {
        from: ConnectionState.DISCONNECTED,
        to: ConnectionState.CONNECTING,
        trigger: 'connect_requested',
        data: { timestamp: Date.now() }
      };

      // Act
      await stateMachine.transition(transition);

      // London School: Verify history interaction
      expect(mockStateStore.getStateHistory).toHaveBeenCalled();
      expect(mockStateEventEmitter.emitStateChange).toHaveBeenCalledWith({
        from: ConnectionState.DISCONNECTED,
        to: ConnectionState.CONNECTING,
        context: mockConnectionContext,
        historyEntry: expect.objectContaining({
          transition,
          timestamp: expect.any(Number)
        })
      });
    });

    it('should provide state analytics through history', async () => {
      // London School: Mock analytics collaborator
      const mockAnalytics = {
        recordTransition: jest.fn(),
        getTransitionMetrics: jest.fn(),
      };

      mockStateStore.getStateHistory.mockReturnValue([
        { state: ConnectionState.DISCONNECTED, timestamp: 1000 },
        { state: ConnectionState.CONNECTING, timestamp: 1100 },
        { state: ConnectionState.CONNECTED, timestamp: 1200 }
      ]);

      mockAnalytics.getTransitionMetrics.mockReturnValue({
        averageConnectionTime: 200,
        successRate: 0.95,
        mostCommonErrors: ['timeout', 'network_error']
      });

      const stateMachine = new ConnectionStateMachine({
        context: mockConnectionContext,
        stateStore: mockStateStore,
        transitionValidator: mockTransitionValidator,
        eventEmitter: mockStateEventEmitter,
        analytics: mockAnalytics,
      });

      // Act
      const metrics = stateMachine.getConnectionMetrics();

      // London School: Verify analytics interaction
      expect(mockStateStore.getStateHistory).toHaveBeenCalled();
      expect(mockAnalytics.getTransitionMetrics).toHaveBeenCalledWith([
        { state: ConnectionState.DISCONNECTED, timestamp: 1000 },
        { state: ConnectionState.CONNECTING, timestamp: 1100 },
        { state: ConnectionState.CONNECTED, timestamp: 1200 }
      ]);
      expect(metrics).toEqual({
        averageConnectionTime: 200,
        successRate: 0.95,
        mostCommonErrors: ['timeout', 'network_error']
      });
    });
  });

  describe('Error Recovery and Cleanup', () => {
    it('should handle transition execution failures', async () => {
      // London School: Mock transition execution failure
      mockStateStore.getCurrentState.mockReturnValue(ConnectionState.DISCONNECTED);
      mockTransitionValidator.isValidTransition.mockReturnValue(true);
      mockTransitionValidator.validateTransitionData.mockReturnValue({ valid: true });
      mockStateStore.setState.mockRejectedValue(new Error('State store failure'));

      const failingTransition: StateTransition = {
        from: ConnectionState.DISCONNECTED,
        to: ConnectionState.CONNECTING,
        trigger: 'connect_requested',
        data: {}
      };

      // Act & Assert
      await expect(stateMachine.transition(failingTransition)).rejects.toThrow('State store failure');

      // London School: Verify error recovery interaction
      expect(mockStateEventEmitter.emitTransitionFailed).toHaveBeenCalledWith({
        transition: failingTransition,
        reason: 'State store failure',
        error: expect.objectContaining({ message: 'State store failure' })
      });
    });

    it('should reset state machine on critical errors', async () => {
      // London School: Mock critical error scenario
      const mockErrorRecovery = {
        handleCriticalError: jest.fn(),
        resetToSafeState: jest.fn(),
      };

      mockStateStore.getCurrentState.mockReturnValue(ConnectionState.ERROR);
      mockErrorRecovery.resetToSafeState.mockResolvedValue(ConnectionState.DISCONNECTED);

      const stateMachine = new ConnectionStateMachine({
        context: mockConnectionContext,
        stateStore: mockStateStore,
        transitionValidator: mockTransitionValidator,
        eventEmitter: mockStateEventEmitter,
        errorRecovery: mockErrorRecovery,
      });

      // Act
      await stateMachine.reset();

      // London School: Verify reset interaction
      expect(mockErrorRecovery.resetToSafeState).toHaveBeenCalledWith(mockConnectionContext);
      expect(mockStateStore.setState).toHaveBeenCalledWith(ConnectionState.DISCONNECTED);
      expect(mockStateStore.clearHistory).toHaveBeenCalled();
      expect(mockStateEventEmitter.emitStateChange).toHaveBeenCalledWith({
        from: ConnectionState.ERROR,
        to: ConnectionState.DISCONNECTED,
        context: mockConnectionContext,
        isReset: true
      });
    });
  });
});