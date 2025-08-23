/**
 * Test Setup for Terminal TDD Tests
 * 
 * Configures global mocks and test utilities
 */

import { jest } from '@jest/globals';
import { TextEncoder, TextDecoder } from 'util';
import { WebSocketMock, setupWebSocketMock } from '../mocks/WebSocketMock';

// Setup global TextEncoder/TextDecoder for Node.js environment
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Setup WebSocket mock globally
setupWebSocketMock();

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock timers for testing time-dependent behavior
beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// Global test utilities
(global as any).createMockLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
});

(global as any).createMockRetryManager = () => ({
  shouldRetry: jest.fn(),
  getNextDelay: jest.fn(),
  reset: jest.fn(),
  incrementAttempt: jest.fn(),
  executeWithRetry: jest.fn(),
  getCurrentAttempt: jest.fn().mockReturnValue(0),
  getMetrics: jest.fn()
});

(global as any).createMockMessageHandler = () => ({
  handleOutput: jest.fn(),
  handleError: jest.fn(),
  handleConnectionStatus: jest.fn(),
  handleCommandResult: jest.fn(),
  handleDirectoryChange: jest.fn(),
  handleMessage: jest.fn(),
  handleBatchMessages: jest.fn()
});

(global as any).createMockConnectionManager = () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  getConnectionState: jest.fn().mockReturnValue('disconnected'),
  isConnected: jest.fn().mockReturnValue(false)
});

// Cleanup after all tests
afterAll(() => {
  jest.restoreAllMocks();
});