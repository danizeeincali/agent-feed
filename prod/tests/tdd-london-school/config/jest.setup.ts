/**
 * Jest Setup for TDD London School Tests
 * Global test configuration and custom matchers for behavior verification
 */

import { jest } from '@jest/globals';

// Extended Jest matchers for London School TDD
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalledBefore(mock: jest.MockFunction<any, any>): R;
      toHaveBeenCalledAfter(mock: jest.MockFunction<any, any>): R;
      toHaveInteracted(interactionCount: number): R;
      toSatisfyContract(contract: any): R;
      toFollowCallSequence(expectedSequence: string[]): R;
    }
  }
}

// Global test configuration
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();

  // Reset all mocks to ensure clean state
  jest.resetAllMocks();

  // Clear any timers
  jest.clearAllTimers();
});

afterEach(() => {
  // Restore all mocks after each test
  jest.restoreAllMocks();

  // Clear any remaining timers
  jest.clearAllTimers();

  // Run any pending timers
  jest.runOnlyPendingTimers();
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests, but log the error
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process in tests, but log the error
});

// Custom Jest matchers for London School TDD
expect.extend({
  /**
   * Verify that one mock was called before another
   * Essential for London School interaction verification
   */
  toHaveBeenCalledBefore(received: jest.MockFunction<any, any>, expected: jest.MockFunction<any, any>) {
    const receivedCalls = received.mock.invocationCallOrder;
    const expectedCalls = expected.mock.invocationCallOrder;

    if (!receivedCalls || receivedCalls.length === 0) {
      return {
        message: () => `Expected mock function to have been called before other mock, but it was never called`,
        pass: false
      };
    }

    if (!expectedCalls || expectedCalls.length === 0) {
      return {
        message: () => `Expected the compared mock function to have been called, but it was never called`,
        pass: false
      };
    }

    const receivedFirstCall = Math.min(...receivedCalls);
    const expectedFirstCall = Math.min(...expectedCalls);
    const pass = receivedFirstCall < expectedFirstCall;

    return {
      message: () => pass
        ? `Expected mock function not to have been called before other mock`
        : `Expected mock function to have been called before other mock (order: ${receivedFirstCall} vs ${expectedFirstCall})`,
      pass
    };
  },

  /**
   * Verify that one mock was called after another
   */
  toHaveBeenCalledAfter(received: jest.MockFunction<any, any>, expected: jest.MockFunction<any, any>) {
    const receivedCalls = received.mock.invocationCallOrder;
    const expectedCalls = expected.mock.invocationCallOrder;

    if (!receivedCalls || receivedCalls.length === 0) {
      return {
        message: () => `Expected mock function to have been called after other mock, but it was never called`,
        pass: false
      };
    }

    if (!expectedCalls || expectedCalls.length === 0) {
      return {
        message: () => `Expected the compared mock function to have been called, but it was never called`,
        pass: false
      };
    }

    const receivedFirstCall = Math.min(...receivedCalls);
    const expectedLastCall = Math.max(...expectedCalls);
    const pass = receivedFirstCall > expectedLastCall;

    return {
      message: () => pass
        ? `Expected mock function not to have been called after other mock`
        : `Expected mock function to have been called after other mock (order: ${receivedFirstCall} vs ${expectedLastCall})`,
      pass
    };
  },

  /**
   * Verify the number of interactions with a mock
   */
  toHaveInteracted(received: jest.MockFunction<any, any>, expected: number) {
    const actualCalls = received.mock.calls.length;
    const pass = actualCalls === expected;

    return {
      message: () => pass
        ? `Expected mock function not to have been called exactly ${expected} times`
        : `Expected mock function to have been called exactly ${expected} times, but it was called ${actualCalls} times`,
      pass
    };
  },

  /**
   * Verify that a mock satisfies a contract (London School contract verification)
   */
  toSatisfyContract(received: any, expected: any) {
    const receivedMethods = Object.getOwnPropertyNames(received).filter(
      name => typeof received[name] === 'function'
    );
    const expectedMethods = Object.keys(expected);

    const missingMethods = expectedMethods.filter(method => !receivedMethods.includes(method));
    const extraMethods = receivedMethods.filter(method => !expectedMethods.includes(method) && !method.startsWith('mock'));

    const pass = missingMethods.length === 0;

    return {
      message: () => {
        if (!pass) {
          return `Expected object to satisfy contract. Missing methods: [${missingMethods.join(', ')}]`;
        }
        if (extraMethods.length > 0) {
          return `Object satisfies contract but has extra methods: [${extraMethods.join(', ')}]`;
        }
        return `Expected object not to satisfy contract`;
      },
      pass
    };
  },

  /**
   * Verify that calls follow a specific sequence
   */
  toFollowCallSequence(received: jest.MockFunction<any, any>, expectedSequence: string[]) {
    const calls = received.mock.calls.map(call => {
      // Extract method name from call arguments or use a default representation
      return call[0] || 'unknown';
    });

    const pass = JSON.stringify(calls) === JSON.stringify(expectedSequence);

    return {
      message: () => pass
        ? `Expected mock function not to follow the sequence: [${expectedSequence.join(', ')}]`
        : `Expected mock function to follow sequence: [${expectedSequence.join(', ')}], but got: [${calls.join(', ')}]`,
      pass
    };
  }
});

// Global test utilities
(global as any).createMockLogger = () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
});

(global as any).createMockEventEmitter = () => ({
  on: jest.fn(),
  emit: jest.fn(),
  off: jest.fn(),
  removeAllListeners: jest.fn()
});

// Mock console methods for cleaner test output
const originalConsole = { ...console };

// Option to suppress console output during tests
if (process.env.JEST_SILENT === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}

// Restore console for debugging when needed
(global as any).restoreConsole = () => {
  global.console = originalConsole;
};

// London School test helpers
(global as any).LondonSchoolHelpers = {
  /**
   * Verify that all expected collaborators were called
   */
  verifyCollaboratorInteractions: (collaborators: Record<string, jest.MockFunction<any, any>>) => {
    Object.entries(collaborators).forEach(([name, mock]) => {
      expect(mock).toHaveBeenCalled();
    });
  },

  /**
   * Verify interaction sequence across multiple mocks
   */
  verifyInteractionSequence: (interactions: Array<{ mock: jest.MockFunction<any, any>, name: string }>) => {
    const callOrders = interactions.map(({ mock, name }) => ({
      name,
      orders: mock.mock.invocationCallOrder || []
    }));

    // Sort by first call order
    callOrders.sort((a, b) => {
      const aFirst = Math.min(...a.orders);
      const bFirst = Math.min(...b.orders);
      return aFirst - bFirst;
    });

    // Return sorted sequence for assertion
    return callOrders.map(co => co.name);
  },

  /**
   * Create a spy that tracks all method calls
   */
  createMethodSpy: (obj: any) => {
    const spy = {};
    Object.getOwnPropertyNames(Object.getPrototypeOf(obj)).forEach(name => {
      if (typeof obj[name] === 'function' && name !== 'constructor') {
        spy[name] = jest.spyOn(obj, name);
      }
    });
    return spy;
  }
};

// Test environment information
console.log('🧪 TDD London School Test Environment Initialized');
console.log(`📊 Jest Version: ${require('jest/package.json').version}`);
console.log(`🎯 Node Environment: ${process.env.NODE_ENV || 'test'}`);
console.log(`⚙️  Timezone: ${process.env.TZ || 'UTC'}`);

// Performance monitoring for tests
const testStartTimes = new Map<string, number>();

beforeEach(() => {
  const testName = expect.getState().currentTestName || 'unknown';
  testStartTimes.set(testName, Date.now());
});

afterEach(() => {
  const testName = expect.getState().currentTestName || 'unknown';
  const startTime = testStartTimes.get(testName);
  if (startTime) {
    const duration = Date.now() - startTime;
    if (duration > 5000) { // Warn about slow tests
      console.warn(`⚠️  Slow test detected: ${testName} took ${duration}ms`);
    }
    testStartTimes.delete(testName);
  }
});

// Cleanup after all tests
afterAll(() => {
  // Final cleanup
  testStartTimes.clear();
  console.log('🏁 TDD London School Tests Completed');
});