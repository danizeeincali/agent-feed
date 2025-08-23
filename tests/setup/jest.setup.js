/**
 * Jest Setup for TDD London School Tests
 * 
 * Global test configuration and mock setup
 */

import { jest } from '@jest/globals';
import 'jest-extended';

// Global test timeout
jest.setTimeout(10000);

// Console configuration for test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress React warnings in tests unless in debug mode
  if (!process.env.DEBUG_TESTS) {
    console.error = (...args) => {
      // Allow through specific errors we want to see
      const message = args[0];
      if (
        typeof message === 'string' && 
        !message.includes('Warning: ReactDOM.render is deprecated') &&
        !message.includes('Warning: componentWillReceiveProps has been renamed')
      ) {
        originalConsoleError.apply(console, args);
      }
    };
    
    console.warn = (...args) => {
      const message = args[0];
      if (
        typeof message === 'string' && 
        !message.includes('Warning:') &&
        !message.includes('React')
      ) {
        originalConsoleWarn.apply(console, args);
      }
    };
  }
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global mock cleanup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset modules to prevent state leaking
  jest.resetModules();
  
  // Clear timers
  jest.clearAllTimers();
});

afterEach(() => {
  // Cleanup after each test
  jest.restoreAllMocks();
  jest.useRealTimers();
  
  // Clear any event listeners
  if (global.removeAllListeners) {
    global.removeAllListeners();
  }
});

// Mock DOM environment for React components
if (typeof window === 'undefined') {
  global.window = {
    location: { href: 'http://localhost:3000' },
    localStorage: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    },
    sessionStorage: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    },
    confirm: jest.fn(() => true),
    alert: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  };
}

// Mock process.env for consistent testing
process.env.NODE_ENV = 'test';
process.env.CLAUDE_HUB_URL = 'http://localhost:3002';

// Global mock factories for consistent mocking
global.createMockChildProcess = () => {
  const mockProcess = {
    pid: 1234 + Math.floor(Math.random() * 1000),
    kill: jest.fn(),
    stdin: { write: jest.fn() },
    stdout: { on: jest.fn(), emit: jest.fn() },
    stderr: { on: jest.fn(), emit: jest.fn() },
    on: jest.fn(),
    emit: jest.fn()
  };
  
  return mockProcess;
};

global.createMockProcessManager = () => ({
  launchInstance: jest.fn(),
  killInstance: jest.fn(),
  restartInstance: jest.fn(),
  getProcessInfo: jest.fn(),
  updateConfig: jest.fn(),
  sendInput: jest.fn(),
  cleanup: jest.fn(),
  on: jest.fn(),
  emit: jest.fn()
});

global.createMockApiService = () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
});

global.createMockWebSocket = () => ({
  send: jest.fn(),
  close: jest.fn(),
  on: jest.fn(),
  emit: jest.fn(),
  readyState: 1 // WebSocket.OPEN
});

// Mock timers utility
global.mockTimers = {
  useFake: () => jest.useFakeTimers(),
  useReal: () => jest.useRealTimers(),
  advanceBy: (ms) => jest.advanceTimersByTime(ms),
  runPending: () => jest.runOnlyPendingTimers(),
  runAll: () => jest.runAllTimers()
};

// Behavior verification utilities
global.behaviorVerification = {
  // Track function calls and order
  createCallTracker: () => {
    const calls = [];
    return {
      track: (name, args = []) => calls.push({ name, args, timestamp: Date.now() }),
      getCalls: () => [...calls],
      reset: () => calls.length = 0,
      verifyCallSequence: (expectedSequence) => {
        const actualSequence = calls.map(call => call.name);
        expect(actualSequence).toEqual(expectedSequence);
      },
      verifyCallCount: (functionName, expectedCount) => {
        const count = calls.filter(call => call.name === functionName).length;
        expect(count).toBe(expectedCount);
      }
    };
  },
  
  // Verify mock interactions
  verifyMockInteractions: (mock, expectedCalls) => {
    expect(mock).toHaveBeenCalledTimes(expectedCalls.length);
    expectedCalls.forEach((expectedCall, index) => {
      expect(mock).toHaveBeenNthCalledWith(index + 1, ...expectedCall);
    });
  },
  
  // Verify object collaboration
  verifyCollaboration: (mockA, mockB, collaborationPattern) => {
    const callsA = mockA.mock.calls;
    const callsB = mockB.mock.calls;
    
    collaborationPattern.forEach(({ functionA, functionB, relationship }) => {
      const callsToA = callsA.filter(call => call[0] === functionA);
      const callsToB = callsB.filter(call => call[0] === functionB);
      
      if (relationship === 'before') {
        expect(callsToA.length).toBeGreaterThan(0);
        expect(callsToB.length).toBeGreaterThan(0);
        // Additional timing verification could be added here
      }
    });
  }
};

// Contract testing utilities
global.contractTesting = {
  // Verify interface compliance
  verifyInterface: (object, expectedInterface) => {
    Object.keys(expectedInterface).forEach(key => {
      expect(object).toHaveProperty(key);
      expect(typeof object[key]).toBe(expectedInterface[key]);
    });
  },
  
  // Verify data structure contracts
  verifyDataContract: (data, contract) => {
    expect(data).toEqual(expect.objectContaining(contract));
  },
  
  // Verify error contracts
  verifyErrorContract: (error, expectedProperties) => {
    expect(error).toBeInstanceOf(Error);
    expectedProperties.forEach(property => {
      expect(error).toHaveProperty(property);
    });
  }
};

// Mock network requests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('')
  })
);

// Mock file system operations
global.mockFileSystem = {
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn(() => '# Mock File Content'),
  writeFileSync: jest.fn(),
  mkdir: jest.fn(),
  rmdir: jest.fn()
};

// Console utilities for test debugging
global.testDebug = {
  log: (...args) => {
    if (process.env.DEBUG_TESTS) {
      console.log('[TEST DEBUG]', ...args);
    }
  },
  error: (...args) => {
    if (process.env.DEBUG_TESTS) {
      console.error('[TEST ERROR]', ...args);
    }
  },
  mockCall: (mockName, ...args) => {
    if (process.env.DEBUG_TESTS) {
      console.log(`[MOCK CALL] ${mockName}:`, args);
    }
  }
};