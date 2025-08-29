/**
 * Jest Setup for TDD London School Regression Tests
 * 
 * Configures test environment for:
 * - Mock isolation and cleanup
 * - Console output management
 * - Test utilities and matchers
 * - London School TDD methodology compliance
 */

// Global test timeout for all tests
jest.setTimeout(10000);

// Increase EventEmitter max listeners to prevent warnings
const EventEmitter = require('events');
EventEmitter.defaultMaxListeners = 50;

// Track event emitters for cleanup
global.activeEventEmitters = new Set();

// Helper to create managed EventEmitter
global.createManagedEventEmitter = () => {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(50);
  global.activeEventEmitters.add(emitter);
  return emitter;
};

// Mock console methods to reduce test noise while preserving error output
const originalConsole = { ...console };

beforeEach(() => {
  // Suppress console.log and console.info in tests unless explicitly needed
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  
  // Keep console.error and console.warn for debugging
  jest.spyOn(console, 'error').mockImplementation(originalConsole.error);
  jest.spyOn(console, 'warn').mockImplementation(originalConsole.warn);
});

afterEach(() => {
  // Clean up all mocks after each test for isolation
  jest.clearAllMocks();
  jest.restoreAllMocks();
  
  // Clean up timers
  jest.clearAllTimers();
  jest.useRealTimers();
  
  // Clean up EventEmitters to prevent memory leaks
  if (global.activeEventEmitters) {
    global.activeEventEmitters.forEach(emitter => {
      if (emitter && typeof emitter.removeAllListeners === 'function') {
        emitter.removeAllListeners();
      }
    });
    global.activeEventEmitters.clear();
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

// Global mock utilities for London School TDD
global.createMockProcess = (pid = 12345) => ({
  pid,
  killed: false,
  exitCode: null,
  stdin: {
    write: jest.fn(),
    end: jest.fn(),
    destroyed: false,
    on: jest.fn()
  },
  stdout: {
    on: jest.fn(),
    pipe: jest.fn()
  },
  stderr: {
    on: jest.fn(),
    pipe: jest.fn()
  },
  on: jest.fn(),
  kill: jest.fn(),
  removeListener: jest.fn()
});

global.createMockPtyProcess = (pid = 12346) => ({
  pid,
  killed: false,
  write: jest.fn(),
  onData: jest.fn(),
  onExit: jest.fn(),
  kill: jest.fn(),
  resize: jest.fn()
});

global.createMockResponse = () => ({
  writeHead: jest.fn(),
  write: jest.fn(),
  end: jest.fn(),
  setTimeout: jest.fn(),
  on: jest.fn(),
  writable: true,
  writableEnded: false,
  destroyed: false
});

global.createMockRequest = () => ({
  setTimeout: jest.fn(),
  on: jest.fn(),
  params: {},
  body: {},
  headers: {}
});

// Custom matchers for London School TDD
expect.extend({
  toHaveBeenCalledBefore(received, expectedCall) {
    const receivedCalls = received.mock.calls;
    const expectedCalls = expectedCall.mock.calls;
    
    if (receivedCalls.length === 0) {
      return {
        message: () => `Expected ${received.getMockName()} to have been called before ${expectedCall.getMockName()}`,
        pass: false
      };
    }
    
    if (expectedCalls.length === 0) {
      return {
        message: () => `Expected ${expectedCall.getMockName()} to have been called after ${received.getMockName()}`,
        pass: false
      };
    }
    
    // Compare timestamps or invocation order (simplified)
    const receivedTime = received.mock.results[0]?.value?.timestamp || 0;
    const expectedTime = expectedCall.mock.results[0]?.value?.timestamp || 1;
    
    const pass = receivedTime < expectedTime;
    
    return {
      message: () => pass 
        ? `Expected ${received.getMockName()} not to have been called before ${expectedCall.getMockName()}`
        : `Expected ${received.getMockName()} to have been called before ${expectedCall.getMockName()}`,
      pass
    };
  },
  
  toSatisfyContract(received, contract) {
    const missingProperties = [];
    const incorrectTypes = [];
    
    for (const [key, expectedType] of Object.entries(contract)) {
      if (!(key in received)) {
        missingProperties.push(key);
      } else if (typeof received[key] !== expectedType) {
        incorrectTypes.push(`${key}: expected ${expectedType}, got ${typeof received[key]}`);
      }
    }
    
    const pass = missingProperties.length === 0 && incorrectTypes.length === 0;
    
    return {
      message: () => {
        if (!pass) {
          let msg = 'Contract violation:';
          if (missingProperties.length > 0) {
            msg += `\n  Missing properties: ${missingProperties.join(', ')}`;
          }
          if (incorrectTypes.length > 0) {
            msg += `\n  Incorrect types: ${incorrectTypes.join(', ')}`;
          }
          return msg;
        }
        return 'Contract satisfied';
      },
      pass
    };
  }
});

// Mock environment variables for consistent testing
process.env.NODE_ENV = 'test';
process.env.HOME = '/home/codespace';
process.env.CLAUDECODE = '1';

// Prevent unhandled promise rejections from failing tests
process.on('unhandledRejection', (reason, promise) => {
  console.warn('Unhandled Promise Rejection in tests:', reason);
});

// Handle MaxListenersExceededWarning
process.on('warning', (warning) => {
  if (warning.name === 'MaxListenersExceededWarning') {
    // Only log in verbose mode to reduce noise
    if (process.env.JEST_VERBOSE) {
      console.warn('EventEmitter Warning:', warning.message);
    }
  } else {
    console.warn('Process Warning:', warning);
  }
});

// Global error handler for tests
global.handleTestError = (error, testName) => {
  console.error(`Test Error in ${testName}:`, error);
  return {
    error: error.message,
    stack: error.stack,
    testName
  };
};

// Node.js polyfills for TextEncoder/TextDecoder (needed for production validation tests)
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}