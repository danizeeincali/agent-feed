/**
 * Terminal Test Setup
 * 
 * Global setup for terminal double typing prevention tests.
 * Configures mocks, test utilities, and environment variables.
 */

import { jest } from '@jest/globals';

// Global test configuration
global.console = {
  ...console,
  // Override console methods to reduce noise in tests
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// DOM API mocks for jsdom
Object.defineProperty(window, 'WebSocket', {
  writable: true,
  value: class MockWebSocket {
    constructor(url) {
      this.url = url;
      this.readyState = 1; // OPEN
      this.CONNECTING = 0;
      this.OPEN = 1;
      this.CLOSING = 2;
      this.CLOSED = 3;
    }
    
    send(data) {
      // Mock implementation
    }
    
    close() {
      this.readyState = this.CLOSED;
    }
  }
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock ResizeObserver
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

// Mock BroadcastChannel
global.BroadcastChannel = jest.fn().mockImplementation((name) => ({
  name,
  postMessage: jest.fn(),
  close: jest.fn(),
  onmessage: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));

// Test environment variables for simulating bugs
beforeEach(() => {
  // Reset environment variables
  delete process.env.SIMULATE_DOUBLE_TYPING;
  delete process.env.SIMULATE_DUPLICATE_HANDLERS;
  delete process.env.SIMULATE_DOUBLE_ECHO;
  delete process.env.SIMULATE_DOUBLE_FIT;
  
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset console mocks
  global.console.log.mockClear();
  global.console.warn.mockClear();
  global.console.error.mockClear();
  global.console.debug.mockClear();
  
  // Reset localStorage mock
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});

// Test utilities
global.testUtils = {
  // Enable specific bugs for RED phase testing
  enableDoubleTyping: () => {
    process.env.SIMULATE_DOUBLE_TYPING = 'true';
  },
  
  enableDuplicateHandlers: () => {
    process.env.SIMULATE_DUPLICATE_HANDLERS = 'true';
  },
  
  enableDoubleEcho: () => {
    process.env.SIMULATE_DOUBLE_ECHO = 'true';
  },
  
  enableDoubleFit: () => {
    process.env.SIMULATE_DOUBLE_FIT = 'true';
  },
  
  // Disable all bug simulations for GREEN phase
  disableAllBugs: () => {
    delete process.env.SIMULATE_DOUBLE_TYPING;
    delete process.env.SIMULATE_DUPLICATE_HANDLERS;
    delete process.env.SIMULATE_DOUBLE_ECHO;
    delete process.env.SIMULATE_DOUBLE_FIT;
  },
  
  // Wait for async operations
  waitFor: (ms = 10) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Create mock terminal reference
  createMockTerminalRef: () => ({
    current: null,
    setCurrent: function(terminal) { this.current = terminal; }
  }),
  
  // Create mock socket reference
  createMockSocketRef: () => ({
    current: null,
    setCurrent: function(socket) { this.current = socket; }
  }),
  
  // Verify no duplicate operations
  verifyNoDuplicates: (mockObject, methodName, expectedCallCount = 1) => {
    expect(mockObject[methodName]).toHaveBeenCalledTimes(expectedCallCount);
  },
  
  // Generate test input sequences
  generateInputSequence: (length = 5) => {
    return Array.from({ length }, (_, i) => 
      String.fromCharCode(97 + i) // 'a', 'b', 'c', etc.
    );
  },
  
  // Create mock React component props
  createMockProps: (overrides = {}) => ({
    isVisible: true,
    processStatus: {
      isRunning: true,
      pid: 12345,
      status: 'running'
    },
    ...overrides
  })
};

// Custom matchers for terminal testing
expect.extend({
  toHaveNoDuplicateWrites(terminal) {
    const duplicates = terminal.getDuplicateWrites ? terminal.getDuplicateWrites() : [];
    const pass = duplicates.length === 0;
    
    return {
      pass,
      message: () => pass 
        ? `Expected terminal to have duplicate writes but found none`
        : `Expected terminal to have no duplicate writes but found ${duplicates.length} duplicates`
    };
  },
  
  toHaveNoDuplicateHandlers(socket, event) {
    const duplicates = socket.getDuplicateHandlers ? socket.getDuplicateHandlers(event) : [];
    const pass = duplicates.length === 0;
    
    return {
      pass,
      message: () => pass
        ? `Expected socket to have duplicate ${event} handlers but found none`
        : `Expected socket to have no duplicate ${event} handlers but found ${duplicates.length} duplicates`
    };
  },
  
  toHaveBeenCalledOnce(mockFn) {
    const pass = mockFn.mock.calls.length === 1;
    
    return {
      pass,
      message: () => pass
        ? `Expected function not to have been called once but it was called ${mockFn.mock.calls.length} times`
        : `Expected function to have been called once but it was called ${mockFn.mock.calls.length} times`
    };
  }
});

// Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});