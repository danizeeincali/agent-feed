/**
 * Test Setup for WebSocket Hub Tests
 * London School TDD test environment configuration
 */

import { jest } from '@jest/globals';

// Global test configuration
beforeAll(() => {
  // Set test timeout
  jest.setTimeout(10000);
  
  // Mock global WebSocket if not available in test environment
  if (!global.WebSocket) {
    global.WebSocket = jest.fn(() => ({
      readyState: 1,
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    })) as any;
  }
  
  // Mock performance.now for consistent timing in tests
  if (!global.performance) {
    global.performance = {
      now: jest.fn(() => Date.now())
    } as any;
  }
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset mock call history
  if (jest.isMockFunction(global.performance?.now)) {
    (global.performance.now as jest.Mock).mockClear();
  }
});

afterEach(() => {
  // Verify no unexpected console errors
  if (console.error && jest.isMockFunction(console.error)) {
    expect(console.error).not.toHaveBeenCalled();
  }
});

afterAll(() => {
  // Cleanup global mocks
  jest.restoreAllMocks();
});

// Custom matchers for London School TDD
expect.extend({
  toHaveBeenCalledBefore(received: jest.Mock, expected: jest.Mock) {
    const receivedCalls = received.mock.invocationCallOrder;
    const expectedCalls = expected.mock.invocationCallOrder;
    
    if (receivedCalls.length === 0) {
      return {
        message: () => `Expected mock function to have been called before ${expected.getMockName()}, but it was never called`,
        pass: false
      };
    }
    
    if (expectedCalls.length === 0) {
      return {
        message: () => `Expected mock function ${expected.getMockName()} to have been called after ${received.getMockName()}, but it was never called`,
        pass: false
      };
    }
    
    const pass = Math.min(...receivedCalls) < Math.min(...expectedCalls);
    
    return {
      message: () => pass
        ? `Expected ${received.getMockName()} not to have been called before ${expected.getMockName()}`
        : `Expected ${received.getMockName()} to have been called before ${expected.getMockName()}`,
      pass
    };
  },

  toSatisfyContract(received: any, contract: string[]) {
    const missingMethods = contract.filter(method => 
      !received[method] || typeof received[method] !== 'function'
    );
    
    const pass = missingMethods.length === 0;
    
    return {
      message: () => pass
        ? `Expected object not to satisfy contract`
        : `Expected object to satisfy contract. Missing methods: ${missingMethods.join(', ')}`,
      pass
    };
  }
});

// Declare custom matcher types
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalledBefore(expected: jest.Mock): R;
      toSatisfyContract(contract: string[]): R;
    }
  }
}