/**
 * Jest Setup for TDD Tests
 * Global configuration and mocks
 */

import { jest } from '@jest/globals';

// Global test timeout
jest.setTimeout(30000);

// Global mocks
global.fetch = jest.fn();
global.WebSocket = jest.fn();

// Mock console methods for cleaner test output
const originalConsole = { ...console };

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();

  // Restore console for tests that need it
  global.console = originalConsole;
});

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});

// Custom matchers for UUID validation
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false
      };
    }
  },

  toSupportStringOperations(received) {
    const pass = typeof received === 'string' &&
                 typeof received.slice === 'function' &&
                 typeof received.includes === 'function';

    if (pass) {
      return {
        message: () => `expected ${received} not to support string operations`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to support string operations`,
        pass: false
      };
    }
  }
});

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.VITE_API_BASE_URL = 'http://localhost:3001';
process.env.VITE_WEBSOCKET_URL = 'http://localhost:3001';

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Suppress specific warnings in test environment
const originalError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: ReactDOM.render is deprecated')
  ) {
    return;
  }
  originalError.call(console, ...args);
};