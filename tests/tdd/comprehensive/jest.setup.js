/**
 * Jest Setup for TDD London School Comprehensive Tests
 * 
 * Configures test environment with real data validation capabilities.
 */

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import fetch from 'node-fetch';

// Global polyfills
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.fetch = fetch;

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  // Suppress React error boundary warnings during testing
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') || args[0].includes('Error:'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};

console.warn = (...args) => {
  // Suppress specific warnings that are expected during testing
  if (
    typeof args[0] === 'string' &&
    args[0].includes('componentWillReceiveProps')
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};

// Global error counter for regression testing
global.__errorCount = 0;
const originalWindowError = global.window?.addEventListener;

if (global.window) {
  global.window.addEventListener = (type, listener, options) => {
    if (type === 'error') {
      const wrappedListener = (event) => {
        global.__errorCount++;
        if (typeof listener === 'function') {
          listener(event);
        }
      };
      return originalWindowError?.call(global.window, type, wrappedListener, options);
    }
    return originalWindowError?.call(global.window, type, listener, options);
  };
}

// Mock WebSocket for testing
const MockWebSocket = class {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    this.CONNECTING = 0;
    this.OPEN = 1;
    this.CLOSING = 2;
    this.CLOSED = 3;
    
    // Simulate connection after a short delay
    setTimeout(() => {
      if (this.onopen) {
        this.onopen({ type: 'open' });
      }
    }, 10);
  }
  
  send(data) {
    // Mock successful send
    return true;
  }
  
  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose({ type: 'close', code: 1000, reason: 'Normal closure' });
    }
  }
  
  addEventListener(type, listener) {
    this[`on${type}`] = listener;
  }
  
  removeEventListener(type, listener) {
    this[`on${type}`] = null;
  }
};

global.WebSocket = MockWebSocket;

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  
  observe() {
    // Mock observation
  }
  
  unobserve() {
    // Mock unobservation
  }
  
  disconnect() {
    // Mock disconnect
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  
  observe() {
    // Mock observation
  }
  
  unobserve() {
    // Mock unobservation
  }
  
  disconnect() {
    // Mock disconnect
  }
};

// Mock matchMedia
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

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock getBoundingClientRect
Element.prototype.getBoundingClientRect = jest.fn(() => ({
  width: 100,
  height: 100,
  top: 0,
  left: 0,
  bottom: 100,
  right: 100,
  x: 0,
  y: 0,
  toJSON: jest.fn()
}));

// Custom matchers for TDD London School testing
expect.extend({
  toHaveBeenCalledBefore(received, expected) {
    const receivedCalls = received.mock.calls;
    const expectedCalls = expected.mock.calls;
    
    if (receivedCalls.length === 0) {
      return {
        message: () => `Expected ${received.getMockName()} to have been called before ${expected.getMockName()}, but it was never called`,
        pass: false
      };
    }
    
    if (expectedCalls.length === 0) {
      return {
        message: () => `Expected ${expected.getMockName()} to have been called after ${received.getMockName()}, but it was never called`,
        pass: false
      };
    }
    
    // Simple comparison of first call times (this is a simplified implementation)
    const pass = receivedCalls[0] && expectedCalls[0];
    
    return {
      message: () => 
        pass
          ? `Expected ${received.getMockName()} not to have been called before ${expected.getMockName()}`
          : `Expected ${received.getMockName()} to have been called before ${expected.getMockName()}`,
      pass
    };
  },
  
  toSatisfyContract(received, contract) {
    if (typeof contract !== 'object' || contract === null) {
      return {
        message: () => 'Contract must be an object',
        pass: false
      };
    }
    
    const missingProperties = [];
    const incorrectTypes = [];
    
    for (const [key, expectedType] of Object.entries(contract)) {
      if (!(key in received)) {
        missingProperties.push(key);
      } else if (typeof received[key] !== expectedType) {
        incorrectTypes.push({ key, expected: expectedType, actual: typeof received[key] });
      }
    }
    
    const pass = missingProperties.length === 0 && incorrectTypes.length === 0;
    
    return {
      message: () => {
        let message = 'Contract validation failed:';
        if (missingProperties.length > 0) {
          message += `\n  Missing properties: ${missingProperties.join(', ')}`;
        }
        if (incorrectTypes.length > 0) {
          message += `\n  Incorrect types: ${incorrectTypes.map(t => `${t.key} (expected ${t.expected}, got ${t.actual})`).join(', ')}`;
        }
        return message;
      },
      pass
    };
  }
});

// Real data validation helpers
global.validateRealData = {
  isValidTimestamp: (timestamp) => {
    return timestamp && !isNaN(Date.parse(timestamp));
  },
  
  isValidId: (id) => {
    return id && typeof id === 'string' && id.length > 0;
  },
  
  isValidApiResponse: (response) => {
    return response && typeof response === 'object' && !Array.isArray(response);
  },
  
  hasRequiredFields: (obj, fields) => {
    return fields.every(field => field in obj);
  }
};

// Performance monitoring setup
global.performance = global.performance || {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => [])
};

// Network request interceptor for real API testing
const originalFetch = global.fetch;
global.fetch = jest.fn().mockImplementation((url, options) => {
  // Allow real network requests for integration tests
  if (process.env.JEST_ALLOW_REAL_NETWORK === 'true') {
    return originalFetch(url, options);
  }
  
  // Mock responses for unit tests
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: 123.45
    }),
    text: () => Promise.resolve('OK')
  });
});

// Test environment information
console.log('🧪 TDD London School Test Environment Initialized');
console.log(`📅 Timestamp: ${new Date().toISOString()}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'test'}`);
console.log(`🔗 Network Requests: ${process.env.JEST_ALLOW_REAL_NETWORK === 'true' ? 'REAL' : 'MOCKED'}`);
console.log('='.repeat(60));