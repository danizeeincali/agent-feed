/**
 * TDD London School Test Setup
 * Global test configuration for mock-driven WebSocket testing
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000
});

// Global test environment setup
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: ''
  },
  writable: true
});

// Mock environment variables for testing
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_WEBSOCKET_URL: 'http://localhost:3001',
    NODE_ENV: 'test'
  },
  writable: true
});

// Global mock setup for consistent testing
beforeEach(() => {
  // Clear all timers before each test
  jest.clearAllTimers();
  
  // Reset all mocks
  jest.clearAllMocks();
  
  // Suppress console logs during tests unless explicitly needed
  const originalConsole = console;
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
});

after(() => {
  // Restore console
  global.console = console;
});

// Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Mock ResizeObserver for components that might use it
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock requestAnimationFrame for animations
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

// Mock Blob for message size estimation
global.Blob = jest.fn().mockImplementation((parts, options) => ({
  size: JSON.stringify(parts).length,
  type: options?.type || 'application/json'
}));

// Custom matchers for London School TDD
expect.extend({
  toHaveBeenCalledBefore(received, other) {
    const receivedCalls = received.mock.calls;
    const otherCalls = other.mock.calls;
    
    if (receivedCalls.length === 0) {
      return {
        message: () => `Expected ${received.getMockName()} to have been called before ${other.getMockName()}, but it was never called`,
        pass: false
      };
    }
    
    if (otherCalls.length === 0) {
      return {
        message: () => `Expected ${received.getMockName()} to have been called before ${other.getMockName()}, but ${other.getMockName()} was never called`,
        pass: false
      };
    }
    
    const receivedTime = received.mock.calls[0]?.[Symbol.for('callTime')] || 0;
    const otherTime = other.mock.calls[0]?.[Symbol.for('callTime')] || 0;
    
    const pass = receivedTime < otherTime;
    
    if (pass) {
      return {
        message: () => `Expected ${received.getMockName()} not to have been called before ${other.getMockName()}`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected ${received.getMockName()} to have been called before ${other.getMockName()}`,
        pass: false
      };
    }
  },
  
  toSatisfyContract(received, expectedContract) {
    const missingMethods = [];
    const incorrectTypes = [];
    
    for (const [method, expectedType] of Object.entries(expectedContract)) {
      if (!(method in received)) {
        missingMethods.push(method);
      } else if (typeof received[method] !== expectedType) {
        incorrectTypes.push({
          method,
          expected: expectedType,
          actual: typeof received[method]
        });
      }
    }
    
    const pass = missingMethods.length === 0 && incorrectTypes.length === 0;
    
    if (pass) {
      return {
        message: () => `Expected object not to satisfy contract`,
        pass: true
      };
    } else {
      let message = 'Object does not satisfy contract:';
      
      if (missingMethods.length > 0) {
        message += `\n  Missing methods: ${missingMethods.join(', ')}`;
      }
      
      if (incorrectTypes.length > 0) {
        message += '\n  Incorrect types:';
        incorrectTypes.forEach(({ method, expected, actual }) => {
          message += `\n    ${method}: expected ${expected}, got ${actual}`;
        });
      }
      
      return {
        message: () => message,
        pass: false
      };
    }
  }
});

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalledBefore(other: jest.MockedFunction<any>): R;
      toSatisfyContract(contract: Record<string, string>): R;
    }
  }
}