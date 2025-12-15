/**
 * TDD London School Test Setup
 * 
 * Global test configuration for API integration tests
 * with real API calls and component behavior verification.
 */

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Global polyfills
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock window.matchMedia for React components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() { return null; }
  disconnect() { return null; }
  unobserve() { return null; }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() { return null; }
  disconnect() { return null; }
  unobserve() { return null; }
};

// Increase timeout for integration tests
jest.setTimeout(30000);

// Console logging configuration for debugging
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  // Filter out React warnings that are noise during testing
  const message = args[0];
  if (
    typeof message === 'string' && 
    (
      message.includes('Warning: ReactDOM.render is no longer supported') ||
      message.includes('Warning: React.createFactory() is deprecated') ||
      message.includes('Warning: componentWillReceiveProps has been renamed')
    )
  ) {
    return;
  }
  
  // Log API-related errors for debugging
  if (typeof message === 'string' && message.includes('API')) {
    originalConsoleError('🔍 API Error:', ...args);
  } else {
    originalConsoleError(...args);
  }
};

console.warn = (...args) => {
  const message = args[0];
  if (typeof message === 'string' && message.includes('Warning:')) {
    return; // Suppress React warnings
  }
  originalConsoleWarn(...args);
};

// Global test utilities
global.testUtils = {
  waitFor: (condition, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkCondition = () => {
        if (condition()) {
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for condition after ${timeout}ms`));
        } else {
          setTimeout(checkCondition, 100);
        }
      };
      checkCondition();
    });
  },
  
  createMockRouter: (initialPath = '/') => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: initialPath,
    query: {},
    asPath: initialPath,
    back: jest.fn(),
    beforePopState: jest.fn(),
    prefetch: jest.fn(),
    reload: jest.fn(),
    route: initialPath,
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
  
  mockFetch: (response) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(response),
      clone: function() {
        return {
          json: jest.fn().mockResolvedValue(response)
        };
      }
    });
  },
  
  restoreFetch: () => {
    if (global.fetch.mockRestore) {
      global.fetch.mockRestore();
    }
  }
};

// Setup for each test
beforeEach(() => {
  // Clear any existing timers
  jest.clearAllTimers();
  
  // Reset DOM
  document.body.innerHTML = '';
  
  // Reset any global state
  if (global.testState) {
    global.testState = {};
  }
});

// Cleanup after each test
afterEach(() => {
  // Restore original fetch if it was mocked
  if (global.fetch && global.fetch.mockRestore) {
    global.fetch.mockRestore();
  }
  
  // Clear any pending timers
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// Global error handler
window.addEventListener('error', (event) => {
  console.error('🚨 Unhandled Error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled Promise Rejection:', event.reason);
});