/**
 * Test Setup for Architectural Migration Tests
 *
 * PURPOSE: Configure test environment for React context, routing, and API testing
 * SCOPE: Global test configuration and mocks
 */

import '@testing-library/jest-dom';

// Global test configuration
global.console = {
  ...console,
  // Suppress console logs in tests unless verbose mode
  log: process.env.VERBOSE_TESTS ? console.log : jest.fn(),
  debug: process.env.VERBOSE_TESTS ? console.debug : jest.fn(),
  info: process.env.VERBOSE_TESTS ? console.info : jest.fn(),
  warn: console.warn,
  error: console.error,
};

// Mock window.matchMedia for responsive design tests
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

// Mock window.ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Mock window.performance.now for performance tests
global.performance = {
  ...global.performance,
  now: jest.fn(() => Date.now()),
};

// Mock WebSocket for testing
const mockWebSocket = {
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // OPEN
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

global.WebSocket = jest.fn(() => mockWebSocket);

// Mock fetch for API testing
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: new Map(),
  })
);

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock window.location
delete window.location;
window.location = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
};

// Mock window.history
const mockHistory = {
  pushState: jest.fn(),
  replaceState: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  go: jest.fn(),
  length: 1,
  state: null,
};
global.history = mockHistory;

// Mock CSS.supports for styling tests
global.CSS = {
  supports: jest.fn(() => true),
};

// Mock HTMLElement methods
Element.prototype.scrollTo = jest.fn();
Element.prototype.scrollIntoView = jest.fn();

// Mock Image constructor for image loading tests
global.Image = class {
  constructor() {
    setTimeout(() => {
      this.onload && this.onload();
    }, 100);
  }
};

// Mock URL constructor
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock File and FileReader for file upload tests
global.File = class File {
  constructor(fileBits, fileName, options) {
    this.name = fileName;
    this.size = fileBits.reduce((acc, bit) => acc + bit.length, 0);
    this.type = options?.type || '';
    this.lastModified = Date.now();
  }
};

global.FileReader = class FileReader {
  constructor() {
    this.readyState = 0;
    this.result = null;
    this.error = null;
  }

  readAsText() {
    setTimeout(() => {
      this.readyState = 2;
      this.result = 'mock file content';
      this.onload && this.onload();
    }, 100);
  }

  readAsDataURL() {
    setTimeout(() => {
      this.readyState = 2;
      this.result = 'data:text/plain;base64,bW9jayBmaWxlIGNvbnRlbnQ=';
      this.onload && this.onload();
    }, 100);
  }
};

// Mock Blob constructor
global.Blob = class Blob {
  constructor(blobParts, options) {
    this.size = blobParts.reduce((acc, part) => acc + part.length, 0);
    this.type = options?.type || '';
  }
};

// Mock process.env for environment variable tests
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  NEXT_PUBLIC_API_URL: 'http://localhost:3000/api',
};

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Increase Jest timeout for integration tests
jest.setTimeout(30000);

// Custom matchers for architectural migration testing
expect.extend({
  toBeValidReactComponent(received) {
    const pass = received && typeof received === 'function' ||
                 received && typeof received === 'object' && received.$$typeof;

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid React component`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid React component`,
        pass: false,
      };
    }
  },

  toHaveValidApiResponse(received) {
    const pass = received &&
                 typeof received.ok === 'boolean' &&
                 typeof received.status === 'number' &&
                 typeof received.json === 'function';

    if (pass) {
      return {
        message: () => `expected ${received} not to have valid API response structure`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have valid API response structure`,
        pass: false,
      };
    }
  },

  toRenderWithoutErrors(received) {
    const pass = received && !received.error;

    if (pass) {
      return {
        message: () => `expected component to render with errors`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected component to render without errors, but got: ${received.error}`,
        pass: false,
      };
    }
  }
});

// Setup cleanup between tests
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();

  // Reset fetch mock
  if (global.fetch && global.fetch.mockClear) {
    global.fetch.mockClear();
  }

  // Reset localStorage
  localStorageMock.clear();
  sessionStorageMock.clear();

  // Reset console mocks if not in verbose mode
  if (!process.env.VERBOSE_TESTS) {
    console.log.mockClear && console.log.mockClear();
    console.debug.mockClear && console.debug.mockClear();
    console.info.mockClear && console.info.mockClear();
  }
});

// Global setup completion log
console.info('🔧 Architectural Migration Test Setup Complete');
console.info('📋 Environment configured for React context, routing, and API testing');
console.info('🎯 Ready for TDD architectural migration validation');