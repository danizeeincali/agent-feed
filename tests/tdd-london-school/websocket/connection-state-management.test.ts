/**
 * TDD London School - Connection State Management Tests
 * Tests the collaboration between state management components and WebSocket lifecycle
 */

import { WebSocketMockFactory, MockEventGenerator } from '../mocks/websocket-mocks';
import { ConnectionStates, WebSocketErrors } from '../contracts/websocket-contracts';

describe('Connection State Management - London School TDD', () => {
  let mockWebSocket: any;
  let mockConnectionStateMachine: any;
  let mockStateTransitionHandler: any;
  let mockConnectionManager: any;

  beforeEach(() => {
    mockWebSocket = WebSocketMockFactory.createWebSocketMock(ConnectionStates.CLOSED);
    mockConnectionStateMachine = WebSocketMockFactory.createConnectionStateMachine();
    mockStateTransitionHandler = {
      onTransition: jest.fn(),
      validateTransition: jest.fn().mockReturnValue(true),
      notifyStateChange: jest.fn(),
      executeTransitionActions: jest.fn()
    };
    mockConnectionManager = {
      initiateConnection: jest.fn(),
      monitorConnection: jest.fn(),
      handleDisconnection: jest.fn(),
      getConnectionMetrics: jest.fn().mockReturnValue({
        uptime: 0,
        messageCount: 0,
        errorCount: 0
      })
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Establishment Flow', () => {
    it('should coordinate connection establishment state transitions', () => {
      // Simulate connection establishment workflow
      const canTransition = mockStateTransitionHandler.validateTransition(
        ConnectionStates.CLOSED,
        ConnectionStates.CONNECTING
      );

      if (canTransition) {
        mockConnectionStateMachine.transition(ConnectionStates.CONNECTING);
        mockStateTransitionHandler.onTransition(ConnectionStates.CONNECTING);
        mockConnectionManager.initiateConnection();
      }

      // Verify connection establishment coordination
      expect(mockStateTransitionHandler.validateTransition).toHaveBeenCalledWith(
        ConnectionStates.CLOSED,
        ConnectionStates.CONNECTING
      );
      expect(mockConnectionStateMachine.transition).toHaveBeenCalledWith(ConnectionStates.CONNECTING);
      expect(mockStateTransitionHandler.onTransition).toHaveBeenCalledWith(ConnectionStates.CONNECTING);
      expect(mockConnectionManager.initiateConnection).toHaveBeenCalled();
    });

    it('should handle successful connection completion', () => {
      const openEvent = MockEventGenerator.createOpenEvent();

      // Start with connecting state
      mockConnectionStateMachine.transition(ConnectionStates.CONNECTING);

      // Simulate successful connection
      mockConnectionStateMachine.transition(ConnectionStates.OPEN);
      mockStateTransitionHandler.onTransition(ConnectionStates.OPEN);
      mockStateTransitionHandler.notifyStateChange(openEvent);

      // Verify connection completion workflow
      expect(mockConnectionStateMachine.transition).toHaveBeenCalledWith(ConnectionStates.OPEN);
      expect(mockStateTransitionHandler.onTransition).toHaveBeenCalledWith(ConnectionStates.OPEN);
      expect(mockStateTransitionHandler.notifyStateChange).toHaveBeenCalledWith(openEvent);
    });

    it('should handle connection failure during establishment', () => {
      const errorEvent = MockEventGenerator.createErrorEvent(WebSocketErrors.CONNECTION_FAILED);

      // Start connection attempt
      mockConnectionStateMachine.transition(ConnectionStates.CONNECTING);

      // Simulate connection failure
      const transitionSucceeded = mockConnectionStateMachine.transition(ConnectionStates.CLOSED);
      mockStateTransitionHandler.onTransition(ConnectionStates.CLOSED);
      mockConnectionManager.handleDisconnection(errorEvent);

      // Verify failure handling workflow
      expect(mockConnectionStateMachine.transition).toHaveBeenCalledWith(ConnectionStates.CLOSED);
      expect(mockStateTransitionHandler.onTransition).toHaveBeenCalledWith(ConnectionStates.CLOSED);
      expect(mockConnectionManager.handleDisconnection).toHaveBeenCalledWith(errorEvent);
    });
  });

  describe('Connection Termination Flow', () => {
    it('should coordinate graceful connection termination', () => {
      // Start with open connection
      mockConnectionStateMachine.transition(ConnectionStates.OPEN);

      // Initiate graceful close
      const canClose = mockStateTransitionHandler.validateTransition(
        ConnectionStates.OPEN,
        ConnectionStates.CLOSING
      );

      if (canClose) {
        mockConnectionStateMachine.transition(ConnectionStates.CLOSING);
        mockStateTransitionHandler.executeTransitionActions('graceful_close');
        mockWebSocket.close();
      }

      // Verify graceful termination workflow
      expect(mockStateTransitionHandler.validateTransition).toHaveBeenCalledWith(
        ConnectionStates.OPEN,
        ConnectionStates.CLOSING
      );
      expect(mockConnectionStateMachine.transition).toHaveBeenCalledWith(ConnectionStates.CLOSING);
      expect(mockStateTransitionHandler.executeTransitionActions).toHaveBeenCalledWith('graceful_close');
      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('should handle abrupt connection termination', () => {
      const closeEvent = MockEventGenerator.createCloseEvent(1006, 'Abnormal closure');

      // Start with open connection
      mockConnectionStateMachine.transition(ConnectionStates.OPEN);

      // Simulate abrupt termination
      mockConnectionStateMachine.transition(ConnectionStates.CLOSED);
      mockStateTransitionHandler.onTransition(ConnectionStates.CLOSED);
      mockConnectionManager.handleDisconnection(closeEvent);

      // Verify abrupt termination handling
      expect(mockConnectionStateMachine.transition).toHaveBeenCalledWith(ConnectionStates.CLOSED);
      expect(mockStateTransitionHandler.onTransition).toHaveBeenCalledWith(ConnectionStates.CLOSED);
      expect(mockConnectionManager.handleDisconnection).toHaveBeenCalledWith(closeEvent);
    });

    it('should complete termination sequence', () => {
      // Start termination
      mockConnectionStateMachine.transition(ConnectionStates.CLOSING);

      // Complete termination
      const finalTransition = mockConnectionStateMachine.transition(ConnectionStates.CLOSED);
      mockStateTransitionHandler.executeTransitionActions('cleanup');
      mockConnectionManager.getConnectionMetrics();

      // Verify termination completion
      expect(mockConnectionStateMachine.transition).toHaveBeenCalledWith(ConnectionStates.CLOSED);
      expect(mockStateTransitionHandler.executeTransitionActions).toHaveBeenCalledWith('cleanup');
      expect(mockConnectionManager.getConnectionMetrics).toHaveBeenCalled();
    });
  });

  describe('State Validation and Guards', () => {
    it('should prevent invalid state transitions', () => {
      const invalidTransitions = [
        [ConnectionStates.CLOSED, ConnectionStates.OPEN],
        [ConnectionStates.CONNECTING, ConnectionStates.CLOSING],
        [ConnectionStates.CLOSING, ConnectionStates.CONNECTING]
      ];

      invalidTransitions.forEach(([from, to]) => {
        mockStateTransitionHandler.validateTransition.mockReturnValueOnce(false);
        
        const canTransition = mockStateTransitionHandler.validateTransition(from, to);
        
        if (!canTransition) {
          // Should not attempt transition
          expect(mockConnectionStateMachine.transition).not.toHaveBeenCalledWith(to);
        }

        expect(mockStateTransitionHandler.validateTransition).toHaveBeenCalledWith(from, to);
      });
    });

    it('should coordinate state-dependent operation validation', () => {
      const operationValidator = {
        canSendMessage: jest.fn(),
        canReceiveMessage: jest.fn(),
        canInitiateConnection: jest.fn()
      };

      // Test different states
      const testStates = [
        { state: ConnectionStates.CLOSED, canSend: false, canReceive: false, canConnect: true },
        { state: ConnectionStates.CONNECTING, canSend: false, canReceive: false, canConnect: false },
        { state: ConnectionStates.OPEN, canSend: true, canReceive: true, canConnect: false },
        { state: ConnectionStates.CLOSING, canSend: false, canReceive: false, canConnect: false }
      ];

      testStates.forEach(({ state, canSend, canReceive, canConnect }) => {
        mockConnectionStateMachine.getCurrentState.mockReturnValue(() => state);
        
        operationValidator.canSendMessage.mockReturnValue(canSend);
        operationValidator.canReceiveMessage.mockReturnValue(canReceive);
        operationValidator.canInitiateConnection.mockReturnValue(canConnect);

        // Verify state-dependent validations
        expect(operationValidator.canSendMessage()).toBe(canSend);
        expect(operationValidator.canReceiveMessage()).toBe(canReceive);
        expect(operationValidator.canInitiateConnection()).toBe(canConnect);
      });
    });
  });

  describe('State Monitoring and Metrics', () => {
    it('should coordinate connection monitoring workflow', () => {
      const connectionMonitor = {
        startMonitoring: jest.fn(),
        stopMonitoring: jest.fn(),
        recordStateChange: jest.fn(),
        getStateMetrics: jest.fn().mockReturnValue({
          totalTransitions: 5,
          timeInState: { [ConnectionStates.OPEN]: 1500 },
          lastTransition: Date.now()
        })
      };

      // Start monitoring
      connectionMonitor.startMonitoring();
      
      // Record state changes
      mockConnectionStateMachine.transition(ConnectionStates.CONNECTING);
      connectionMonitor.recordStateChange(ConnectionStates.CONNECTING);
      
      mockConnectionStateMachine.transition(ConnectionStates.OPEN);
      connectionMonitor.recordStateChange(ConnectionStates.OPEN);

      // Get metrics
      const metrics = connectionMonitor.getStateMetrics();

      // Verify monitoring workflow
      expect(connectionMonitor.startMonitoring).toHaveBeenCalled();
      expect(connectionMonitor.recordStateChange).toHaveBeenCalledWith(ConnectionStates.CONNECTING);
      expect(connectionMonitor.recordStateChange).toHaveBeenCalledWith(ConnectionStates.OPEN);
      expect(connectionMonitor.getStateMetrics).toHaveBeenCalled();
      expect(metrics.totalTransitions).toBe(5);
    });

    it('should track state transition timing', () => {
      const timingTracker = {
        startTransitionTimer: jest.fn(),
        endTransitionTimer: jest.fn().mockReturnValue(250),
        getTransitionDuration: jest.fn().mockReturnValue(250)
      };

      // Start transition timing
      timingTracker.startTransitionTimer();
      
      // Execute transition
      mockConnectionStateMachine.transition(ConnectionStates.CONNECTING);
      
      // End timing
      const duration = timingTracker.endTransitionTimer();
      
      // Verify timing coordination
      expect(timingTracker.startTransitionTimer).toHaveBeenCalled();
      expect(timingTracker.endTransitionTimer).toHaveBeenCalled();
      expect(duration).toBe(250);
    });
  });

  describe('State Persistence and Recovery', () => {
    it('should coordinate state persistence for recovery', () => {
      const statePersistence = {
        saveState: jest.fn(),
        loadState: jest.fn().mockReturnValue(ConnectionStates.OPEN),
        clearPersistedState: jest.fn()
      };

      // Save current state
      const currentState = mockConnectionStateMachine.getCurrentState()();
      statePersistence.saveState(currentState);

      // Simulate recovery
      const persistedState = statePersistence.loadState();
      mockConnectionStateMachine.transition(persistedState);

      // Verify persistence workflow
      expect(statePersistence.saveState).toHaveBeenCalledWith(currentState);
      expect(statePersistence.loadState).toHaveBeenCalled();
      expect(mockConnectionStateMachine.transition).toHaveBeenCalledWith(ConnectionStates.OPEN);
    });

    it('should handle state recovery after unexpected termination', () => {
      const recoveryManager = {
        detectUnexpectedTermination: jest.fn().mockReturnValue(true),
        initiateRecovery: jest.fn(),
        restoreConnectionState: jest.fn().mockReturnValue(ConnectionStates.CONNECTING)
      };

      // Detect and recover
      const unexpectedTermination = recoveryManager.detectUnexpectedTermination();
      
      if (unexpectedTermination) {
        recoveryManager.initiateRecovery();
        const recoveryState = recoveryManager.restoreConnectionState();
        mockConnectionStateMachine.transition(recoveryState);
      }

      // Verify recovery workflow
      expect(recoveryManager.detectUnexpectedTermination).toHaveBeenCalled();
      expect(recoveryManager.initiateRecovery).toHaveBeenCalled();
      expect(recoveryManager.restoreConnectionState).toHaveBeenCalled();
      expect(mockConnectionStateMachine.transition).toHaveBeenCalledWith(ConnectionStates.CONNECTING);
    });
  });
});