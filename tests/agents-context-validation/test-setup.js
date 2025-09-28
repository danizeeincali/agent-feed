/**
 * Test Setup for Agents Context Validation Tests
 *
 * Global test configuration and mocks for React context testing
 */

// Import testing utilities
require('@testing-library/jest-dom');

// Polyfill for Node.js test environment
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Next.js modules
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/agents',
      pathname: '/agents',
      query: {},
      asPath: '/agents',
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

jest.mock('next/head', () => {
  return function Head({ children }) {
    return children;
  };
});

jest.mock('next/image', () => {
  return function Image({ src, alt, ...props }) {
    const mockReact = require('react');
    return mockReact.createElement('img', { src, alt, ...props });
  };
});

// Mock Next.js dynamic imports
jest.mock('next/dynamic', () => {
  return function dynamic(importFn, options = {}) {
    const mockReact = require('react');
    const Component = mockReact.lazy(importFn);

    return mockReact.forwardRef((props, ref) => {
      return mockReact.createElement(
        mockReact.Suspense,
        { fallback: options.loading || mockReact.createElement('div', null, 'Loading...') },
        mockReact.createElement(Component, { ...props, ref })
      );
    });
  };
});

// Global fetch mock
global.fetch = jest.fn();

// Mock window and document for JSDOM environment
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
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Suppress specific warnings that are expected in test environment
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    // Suppress known test environment warnings
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: componentWillReceiveProps has been renamed'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Global test utilities
global.testUtils = {
  // Create mock agents data
  createMockAgents: (count = 11) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `agent${i + 1}`,
      display_name: `Agent ${i + 1}`,
      status: 'active',
      description: `Test agent ${i + 1} description`,
      capabilities: ['test', 'validation', 'mock'],
      avatar_color: '#4338ca',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
  },

  // Create mock API response
  createMockApiResponse: (agents, success = true) => {
    if (!success) {
      return {
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' })
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({ agents })
    };
  },

  // Wait for async operations
  waitForAsync: async (timeout = 1000) => {
    return new Promise(resolve => setTimeout(resolve, timeout));
  },

  // Check for React warnings in console
  getReactWarnings: (consoleOutput) => {
    return consoleOutput.filter(output =>
      output.some(arg =>
        typeof arg === 'string' &&
        (arg.includes('Warning:') || arg.includes('Error:'))
      )
    );
  }
};

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch.mockClear();
});

// Cleanup after each test
afterEach(() => {
  // Clean up any lingering timers
  jest.clearAllTimers();

  // Reset DOM
  document.body.innerHTML = '';

  // Reset fetch mock
  global.fetch.mockReset();
});