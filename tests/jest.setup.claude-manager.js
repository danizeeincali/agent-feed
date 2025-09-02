import '@testing-library/jest-dom';

// Mock CSS modules
const mockCSSModules = new Proxy(
  {},
  {
    get: function getter(target, key) {
      if (key === '__esModule') {
        return false;
      }
      return key;
    },
  }
);

// Mock CSS imports
require.extensions['.css'] = () => mockCSSModules;

// Global test setup
global.console = {
  ...console,
  // Suppress console.log in tests unless specifically needed
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: '',
  },
  writable: true,
});

// Enhanced matchers
expect.extend({
  toHaveBeenCalledAfter: (received, expected) => {
    const receivedCalls = received.mock.invocationCallOrder;
    const expectedCalls = expected.mock.invocationCallOrder;
    
    const receivedLastCall = Math.max(...(receivedCalls || [0]));
    const expectedLastCall = Math.max(...(expectedCalls || [0]));
    
    const pass = receivedLastCall > expectedLastCall;
    
    return {
      pass,
      message: () =>
        `expected ${received.getMockName() || 'jest.fn()'} to have been called after ${expected.getMockName() || 'jest.fn()'}`,
    };
  },
});