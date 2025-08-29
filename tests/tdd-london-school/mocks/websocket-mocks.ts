/**
 * TDD London School - WebSocket Mock Factory
 * Creates sophisticated mocks for WebSocket interactions
 */

import { 
  WebSocketContract, 
  ClaudeProcessContract, 
  WebSocketManagerContract,
  ConnectionStates,
  WebSocketErrors
} from '../contracts/websocket-contracts';

export class WebSocketMockFactory {
  static createWebSocketMock(initialState = ConnectionStates.CLOSED): WebSocketContract {
    return {
      send: jest.fn().mockImplementation((data: string) => {
        if (initialState !== ConnectionStates.OPEN) {
          throw new Error(WebSocketErrors.SEND_NOT_DEFINED);
        }
      }),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readyState: initialState,
      url: 'ws://localhost:3001/ws'
    };
  }

  static createFailingWebSocketMock(): WebSocketContract {
    return {
      send: jest.fn().mockImplementation(() => {
        throw new Error(WebSocketErrors.SEND_NOT_DEFINED);
      }),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readyState: ConnectionStates.CLOSED,
      url: 'ws://localhost:3001/ws'
    };
  }

  static createClaudeProcessMock(): ClaudeProcessContract {
    return {
      execute: jest.fn().mockResolvedValue({
        success: true,
        output: 'Claude CLI executed successfully',
        processId: 'mock-process-123'
      }),
      kill: jest.fn().mockResolvedValue(true),
      isRunning: jest.fn().mockReturnValue(true),
      getOutput: jest.fn().mockResolvedValue('Mock output from Claude process')
    };
  }

  static createWebSocketManagerMock(): WebSocketManagerContract {
    return {
      connect: jest.fn().mockResolvedValue(true),
      disconnect: jest.fn().mockResolvedValue(true),
      sendCommand: jest.fn().mockResolvedValue({
        success: true,
        data: 'Command sent successfully'
      }),
      onMessage: jest.fn(),
      onError: jest.fn(),
      onClose: jest.fn(),
      getConnectionState: jest.fn().mockReturnValue(ConnectionStates.OPEN)
    };
  }

  static createMessageSerializerMock() {
    return {
      serialize: jest.fn().mockImplementation((message) => JSON.stringify(message)),
      deserialize: jest.fn().mockImplementation((data) => JSON.parse(data)),
      validate: jest.fn().mockReturnValue(true)
    };
  }

  static createConnectionStateMachine() {
    let currentState = ConnectionStates.CLOSED;
    
    return {
      getCurrentState: jest.fn(() => currentState),
      transition: jest.fn((newState: number) => {
        const validTransitions = {
          [ConnectionStates.CLOSED]: [ConnectionStates.CONNECTING],
          [ConnectionStates.CONNECTING]: [ConnectionStates.OPEN, ConnectionStates.CLOSED],
          [ConnectionStates.OPEN]: [ConnectionStates.CLOSING],
          [ConnectionStates.CLOSING]: [ConnectionStates.CLOSED]
        };

        if (validTransitions[currentState]?.includes(newState)) {
          currentState = newState;
          return true;
        }
        return false;
      }),
      reset: jest.fn(() => {
        currentState = ConnectionStates.CLOSED;
      })
    };
  }
}

// Mock event generator for testing event flows
export class MockEventGenerator {
  static createMessageEvent(data: any) {
    return {
      type: 'message',
      data: JSON.stringify(data),
      timestamp: Date.now()
    };
  }

  static createErrorEvent(error: string) {
    return {
      type: 'error',
      error,
      timestamp: Date.now()
    };
  }

  static createCloseEvent(code = 1000, reason = 'Normal closure') {
    return {
      type: 'close',
      code,
      reason,
      timestamp: Date.now()
    };
  }

  static createOpenEvent() {
    return {
      type: 'open',
      timestamp: Date.now()
    };
  }
}