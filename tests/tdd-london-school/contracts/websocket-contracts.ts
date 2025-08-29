/**
 * TDD London School - WebSocket Contract Definitions
 * Defines the expected interfaces and interactions for WebSocket communication
 */

export interface WebSocketContract {
  send: jest.Mock;
  close: jest.Mock;
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
  readyState: number;
  url: string;
}

export interface ClaudeProcessContract {
  execute: jest.Mock;
  kill: jest.Mock;
  isRunning: jest.Mock;
  getOutput: jest.Mock;
}

export interface WebSocketManagerContract {
  connect: jest.Mock;
  disconnect: jest.Mock;
  sendCommand: jest.Mock;
  onMessage: jest.Mock;
  onError: jest.Mock;
  onClose: jest.Mock;
  getConnectionState: jest.Mock;
}

export interface MessageContract {
  type: 'command' | 'response' | 'error' | 'status';
  payload: any;
  timestamp: number;
  id: string;
}

export interface CommandExecutionContract {
  command: string;
  args?: string[];
  workingDirectory?: string;
  timeout?: number;
}

export interface ResponseContract {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    duration: number;
    processId?: string;
  };
}

// Connection State Constants
export const ConnectionStates = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
} as const;

// Error Types for Testing
export const WebSocketErrors = {
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  SEND_NOT_DEFINED: 'SEND_NOT_DEFINED',
  MESSAGE_SERIALIZATION_ERROR: 'MESSAGE_SERIALIZATION_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  INVALID_MESSAGE_FORMAT: 'INVALID_MESSAGE_FORMAT'
} as const;