/**
 * Jest Setup for TDD London School WebSocket Tests
 * Configures the testing environment for mock-driven development
 */

// Global mock implementations
global.console = {
  ...console,
  // Optionally suppress console output in tests
  log: process.env.NODE_ENV === 'test' ? jest.fn() : console.log,
  warn: process.env.NODE_ENV === 'test' ? jest.fn() : console.warn,
  error: process.env.NODE_ENV === 'test' ? jest.fn() : console.error,
  info: process.env.NODE_ENV === 'test' ? jest.fn() : console.info,
  debug: process.env.NODE_ENV === 'test' ? jest.fn() : console.debug
};

// WebSocket global mock
global.WebSocket = class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CLOSED;
    this.onopen = null;
    this.onclose = null;
    this.onerror = null;
    this.onmessage = null;
  }

  send() {
    throw new Error('send is not defined');
  }

  close() {}

  addEventListener() {}
  removeEventListener() {}
};

// Buffer global for Node.js compatibility
if (typeof global.Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}

// Performance API mock for timing measurements
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn()
};

// Process environment setup
process.env.NODE_ENV = 'test';

// Jest configuration for mock behavior verification
expect.extend({
  toHaveBeenCalledBefore(received, expected) {
    const receivedCalls = received.mock.invocationCallOrder;
    const expectedCalls = expected.mock.invocationCallOrder;
    
    if (!receivedCalls || !expectedCalls) {
      return {
        pass: false,
        message: () => 'Mock functions must be called to use toHaveBeenCalledBefore'
      };
    }

    const receivedLastCall = Math.max(...receivedCalls);
    const expectedFirstCall = Math.min(...expectedCalls);
    
    const pass = receivedLastCall < expectedFirstCall;
    
    return {
      pass,
      message: () => pass 
        ? `Expected ${received.getMockName()} not to be called before ${expected.getMockName()}`
        : `Expected ${received.getMockName()} to be called before ${expected.getMockName()}`
    };
  },

  toSatisfyContract(received, contract) {
    const receivedMethods = Object.keys(received).filter(key => 
      typeof received[key] === 'function' && jest.isMockFunction(received[key])
    );
    
    const contractMethods = Object.keys(contract);
    const missingMethods = contractMethods.filter(method => !receivedMethods.includes(method));
    
    const pass = missingMethods.length === 0;
    
    return {
      pass,
      message: () => pass
        ? `Expected mock not to satisfy contract`
        : `Expected mock to satisfy contract. Missing methods: ${missingMethods.join(', ')}`
    };
  }
});

// Global test utilities
global.createMockPromise = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

global.waitForTick = () => new Promise(resolve => process.nextTick(resolve));
global.waitForTimeout = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

// Mock timers setup for consistent testing
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

// Global error handling for uncaught exceptions in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// London School TDD specific utilities
global.mockCollaborator = (name, methods = {}) => {
  const mock = {};
  Object.keys(methods).forEach(method => {
    mock[method] = jest.fn().mockImplementation(methods[method]);
  });
  mock.getMockName = () => name;
  return mock;
};

global.verifyInteraction = (mock, method, ...args) => {
  expect(mock[method]).toHaveBeenCalledWith(...args);
};

global.verifyInteractionOrder = (...mocks) => {
  for (let i = 0; i < mocks.length - 1; i++) {
    expect(mocks[i]).toHaveBeenCalledBefore(mocks[i + 1]);
  }
};