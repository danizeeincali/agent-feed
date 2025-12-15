/**
 * Test Setup for London School TDD Draft Modal Workflow Tests
 * Configures testing environment for mock-driven behavior verification
 */

import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// Configure React Testing Library for London School TDD
configure({
  // Focus on user interactions and behavior
  testIdAttribute: 'data-testid',
  
  // Async utilities timeout for interaction testing
  asyncUtilTimeout: 5000,
  
  // More lenient queries for mock-driven testing
  computedStyleSupportsPseudoElements: true
});

// Mock IntersectionObserver for modal testing
Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  value: vi.fn(() => ({
    disconnect: vi.fn(),
    observe: vi.fn(),
    unobserve: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: []
  }))
});

// Mock ResizeObserver for responsive components
Object.defineProperty(global, 'ResizeObserver', {
  writable: true,
  value: vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))
});

// Mock window.matchMedia for responsive testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// Mock localStorage for draft persistence testing
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock console methods to reduce test noise
const originalConsole = console;
global.console = {
  ...console,
  // Keep errors and warnings visible for debugging
  error: vi.fn(),
  warn: vi.fn(),
  // Suppress logs in tests unless needed
  log: vi.fn(),
  info: vi.fn(),
  debug: vi.fn()
};

// Restore console after tests if needed
afterAll(() => {
  global.console = originalConsole;
});

// Mock confirm for deletion tests
global.confirm = vi.fn(() => true);

// Mock alert for error handling tests
global.alert = vi.fn();

// Setup DOM cleanup
beforeEach(() => {
  // Reset document.body.style for modal tests
  document.body.style.overflow = 'unset';
  
  // Clear localStorage before each test
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  
  // Reset confirm mock
  vi.mocked(global.confirm).mockReturnValue(true);
});

afterEach(() => {
  // Ensure body scroll is restored after each test
  document.body.style.overflow = 'unset';
  
  // Clear any pending timers
  vi.clearAllTimers();
  
  // Clear console mocks after each test for fresh state
  vi.clearAllMocks();
});

// London School TDD specific setup
beforeAll(() => {
  // Enable fake timers for testing time-dependent interactions
  vi.useFakeTimers();
});

afterAll(() => {
  // Restore real timers
  vi.useRealTimers();
});

// Custom Vitest matchers for London School TDD
expect.extend({
  // Matcher for verifying mock interactions
  toHaveBeenCalledBefore(received: any, expected: any) {
    const receivedCalls = received.mock?.calls || [];
    const expectedCalls = expected.mock?.calls || [];
    
    if (receivedCalls.length === 0) {
      return {
        message: () => `Expected ${received.getMockName()} to have been called before ${expected.getMockName()}, but it was never called`,
        pass: false
      };
    }
    
    if (expectedCalls.length === 0) {
      return {
        message: () => `Expected ${expected.getMockName()} to have been called after ${received.getMockName()}, but it was never called`,
        pass: false
      };
    }
    
    const receivedTime = receivedCalls[0][0]; // Assuming timestamp is first arg
    const expectedTime = expectedCalls[0][0];
    
    const pass = receivedTime < expectedTime;
    
    return {
      message: () => `Expected ${received.getMockName()} to have been called before ${expected.getMockName()}`,
      pass
    };
  },
  
  // Matcher for verifying contract compliance
  toSatisfyContract(received: any, expectedContract: any) {
    const requiredMethods = expectedContract.methods || [];
    const requiredProperties = expectedContract.properties || [];
    
    for (const method of requiredMethods) {
      if (typeof received[method] !== 'function') {
        return {
          message: () => `Expected object to have method '${method}'`,
          pass: false
        };
      }
    }
    
    for (const property of requiredProperties) {
      if (!(property in received)) {
        return {
          message: () => `Expected object to have property '${property}'`,
          pass: false
        };
      }
    }
    
    return {
      message: () => 'Object satisfies contract',
      pass: true
    };
  }
});

// London School TDD utilities
global.londonSchoolTDD = {
  // Verify interaction sequence
  verifyInteractionSequence: (mocks: any[], expectedOrder: string[]) => {
    const callOrder = mocks
      .map((mock, index) => ({ mock, index, calls: mock.mock.calls.length }))
      .filter(({ calls }) => calls > 0)
      .sort((a, b) => {
        // Sort by first call time (assuming timestamps are available)
        const aFirstCall = a.mock.mock.calls[0];
        const bFirstCall = b.mock.mock.calls[0];
        return (aFirstCall?.[0] || 0) - (bFirstCall?.[0] || 0);
      })
      .map(({ index }) => expectedOrder[index]);
      
    return callOrder;
  },
  
  // Create mock with interaction tracking
  createTrackedMock: (name: string) => {
    const mock = vi.fn();
    (mock as any).getMockName = () => name;
    (mock as any).getInteractionLog = () => mock.mock.calls.map((call: any, index: number) => ({
      call: index + 1,
      args: call,
      timestamp: Date.now()
    }));
    return mock;
  }
};

// Type declarations for custom matchers
declare global {
  interface CustomMatchers<R = unknown> {
    toHaveBeenCalledBefore(expected: any): R;
    toSatisfyContract(expectedContract: { methods?: string[]; properties?: string[] }): R;
  }
  
  interface Window {
    londonSchoolTDD: {
      verifyInteractionSequence: (mocks: any[], expectedOrder: string[]) => string[];
      createTrackedMock: (name: string) => any;
    };
  }
}