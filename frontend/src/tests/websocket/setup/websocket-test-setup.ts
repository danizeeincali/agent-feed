/**
 * TDD London School WebSocket Test Setup
 * 
 * Global test setup for WebSocket tests following London School methodology.
 * Sets up mocks, environment simulation, and interaction verification utilities.
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { browserEnvironmentSimulator } from '../fixtures/browser-environment';

// Configure testing library for London School interaction testing
configure({
  testIdAttribute: 'data-testid',
  // Increase timeout for async interactions
  asyncUtilTimeout: 5000
});

// Global test utilities for London School TDD
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalledBefore(mock: jest.MockedFunction<any>): R;
      toHaveBeenCalledAfter(mock: jest.MockedFunction<any>): R;
      toSatisfyContract(contract: any): R;
    }
  }
}

// Custom Jest matchers for London School interaction verification
expect.extend({
  toHaveBeenCalledBefore(received: jest.MockedFunction<any>, expectedMock: jest.MockedFunction<any>) {
    const receivedCallTime = received.mock.invocationCallOrder[0];
    const expectedCallTime = expectedMock.mock.invocationCallOrder[0];
    
    if (!receivedCallTime) {
      return {
        message: () => `Expected ${received.getMockName()} to have been called before ${expectedMock.getMockName()}, but it was never called`,
        pass: false,
      };
    }
    
    if (!expectedCallTime) {
      return {
        message: () => `Expected ${expectedMock.getMockName()} to have been called after ${received.getMockName()}, but it was never called`,
        pass: false,
      };
    }
    
    const pass = receivedCallTime < expectedCallTime;
    
    return {
      message: () => pass
        ? `Expected ${received.getMockName()} not to have been called before ${expectedMock.getMockName()}`
        : `Expected ${received.getMockName()} to have been called before ${expectedMock.getMockName()}`,
      pass,
    };
  },

  toHaveBeenCalledAfter(received: jest.MockedFunction<any>, expectedMock: jest.MockedFunction<any>) {
    const receivedCallTime = received.mock.invocationCallOrder[0];
    const expectedCallTime = expectedMock.mock.invocationCallOrder[0];
    
    if (!receivedCallTime) {
      return {
        message: () => `Expected ${received.getMockName()} to have been called after ${expectedMock.getMockName()}, but it was never called`,
        pass: false,
      };
    }
    
    if (!expectedCallTime) {
      return {
        message: () => `Expected ${expectedMock.getMockName()} to have been called before ${received.getMockName()}, but it was never called`,
        pass: false,
      };
    }
    
    const pass = receivedCallTime > expectedCallTime;
    
    return {
      message: () => pass
        ? `Expected ${received.getMockName()} not to have been called after ${expectedMock.getMockName()}`
        : `Expected ${received.getMockName()} to have been called after ${expectedMock.getMockName()}`,
      pass,
    };
  },

  toSatisfyContract(received: any, contract: any) {
    const receivedKeys = Object.keys(received || {});
    const contractKeys = Object.keys(contract || {});
    
    const missingKeys = contractKeys.filter(key => !receivedKeys.includes(key));
    const extraKeys = receivedKeys.filter(key => !contractKeys.includes(key));
    
    const pass = missingKeys.length === 0;
    
    return {
      message: () => {
        if (missingKeys.length > 0) {
          return `Contract violation: Missing required properties: ${missingKeys.join(', ')}`;
        }
        if (extraKeys.length > 0) {
          return `Contract violation: Unexpected properties: ${extraKeys.join(', ')}`;
        }
        return `Object satisfies contract`;
      },
      pass,
    };
  }
});

// Mock browser APIs globally
beforeAll(() => {
  // Set up browser environment for all tests
  browserEnvironmentSimulator.setup();
  
  // Mock console methods to avoid noise in tests
  global.console = {
    ...global.console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };

  // Mock performance API
  Object.defineProperty(global, 'performance', {
    value: {
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByName: jest.fn(() => []),
      getEntriesByType: jest.fn(() => [])
    }
  });

  // Mock Blob for message size estimation
  global.Blob = class Blob {
    size: number;
    type: string;
    
    constructor(parts: any[], options: any = {}) {
      this.size = JSON.stringify(parts).length;
      this.type = options.type || '';
    }
  } as any;

  // Mock URL for WebSocket connections
  global.URL = class URL {
    href: string;
    origin: string;
    protocol: string;
    host: string;
    
    constructor(url: string, base?: string) {
      this.href = url;
      this.origin = 'http://localhost:3000';
      this.protocol = 'http:';
      this.host = 'localhost:3000';
    }
  } as any;
});

// Clean up after all tests
afterAll(() => {
  browserEnvironmentSimulator.cleanup();
});

// Reset mocks and environment between tests
beforeEach(() => {
  // Clear all mock calls and instances
  jest.clearAllMocks();
  
  // Reset browser environment state
  const mockEnv = browserEnvironmentSimulator.setup();
  mockEnv.document.visibilityState = 'visible';
  mockEnv.document.hidden = false;
  mockEnv.window.navigator.onLine = true;
  
  // Clear localStorage
  mockEnv.localStorage.clear();
  
  // Reset console mocks
  (console.log as jest.Mock).mockClear();
  (console.debug as jest.Mock).mockClear();
  (console.info as jest.Mock).mockClear();
  (console.warn as jest.Mock).mockClear();
  (console.error as jest.Mock).mockClear();
});

afterEach(() => {
  // Clean up any timers or intervals
  jest.useRealTimers();
  
  // Clean up browser environment
  browserEnvironmentSimulator.cleanup();
});

// Utility functions for London School TDD
export const mockInteractionUtils = {
  /**
   * Verify that a sequence of mock calls occurred in the expected order
   */
  verifyCallSequence: (calls: Array<{ mock: jest.MockedFunction<any>, args?: any[] }>) => {
    let lastCallTime = 0;
    
    calls.forEach(({ mock, args }, index) => {
      const callOrder = mock.mock.invocationCallOrder[0];
      expect(callOrder).toBeGreaterThan(lastCallTime);
      
      if (args) {
        expect(mock).toHaveBeenCalledWith(...args);
      }
      
      lastCallTime = callOrder;
    });
  },

  /**
   * Verify that collaborators were called with the expected contract
   */
  verifyCollaboratorContract: (mock: jest.MockedFunction<any>, expectedContract: any) => {
    expect(mock).toHaveBeenCalled();
    const lastCall = mock.mock.calls[mock.mock.calls.length - 1];
    
    if (typeof expectedContract === 'function') {
      expect(lastCall).toEqual(expect.arrayContaining([expect.any(Function)]));
    } else if (typeof expectedContract === 'object') {
      expect(lastCall).toEqual(expect.arrayContaining([expect.objectContaining(expectedContract)]));
    } else {
      expect(lastCall).toEqual(expect.arrayContaining([expectedContract]));
    }
  },

  /**
   * Create a spy that tracks interaction patterns
   */
  createInteractionSpy: (name: string) => {
    const spy = jest.fn();
    spy.mockName = name;
    return spy;
  }
};

// Export test categories for organized test running
export const testCategories = {
  unit: 'unit tests for individual components',
  integration: 'integration tests for component interactions',
  contract: 'contract tests for API compliance',
  behavior: 'behavior tests for user workflows'
};

// London School TDD assertion helpers
export const assertionHelpers = {
  expectCollaboratorInteraction: (collaborator: any, method: string, expectedArgs: any[]) => {
    expect(collaborator[method]).toHaveBeenCalledWith(...expectedArgs);
  },

  expectInteractionSequence: (interactions: Array<{ collaborator: any, method: string, args?: any[] }>) => {
    interactions.forEach(({ collaborator, method, args = [] }) => {
      expect(collaborator[method]).toHaveBeenCalledWith(...args);
    });
  },

  expectNoInteraction: (collaborator: any, method: string) => {
    expect(collaborator[method]).not.toHaveBeenCalled();
  }
};