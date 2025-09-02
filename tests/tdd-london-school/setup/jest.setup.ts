/**
 * Jest Setup for London School TDD
 * 
 * Global test configuration optimized for behavior-driven testing
 * with comprehensive mocking and interaction verification
 */

import '@testing-library/jest-dom';
import { jest, expect } from '@jest/globals';

/**
 * London School TDD Global Setup
 * Focus on mock configuration and interaction tracking
 */

// Global mock setup for consistent behavior across tests
beforeAll(() => {
  // Mock console methods to prevent test pollution while allowing verification
  global.console = {
    ...console,
    // Keep error and warn for debugging, but make them capturable
    error: jest.fn((...args) => {
      // Store original error for potential verification
      (global.console.error as jest.Mock)._originalArgs = args;
    }),
    warn: jest.fn((...args) => {
      (global.console.warn as jest.Mock)._originalArgs = args;
    }),
    // Suppress info and log in tests
    info: jest.fn(),
    log: jest.fn(),
    debug: jest.fn(),
  };

  // Mock window methods that components might use
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      protocol: 'http:',
      host: 'localhost:3000',
      pathname: '/',
      search: '',
      hash: '',
      assign: jest.fn(),
      reload: jest.fn(),
      replace: jest.fn(),
    },
    writable: true,
  });

  // Mock ResizeObserver for components that might use it
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

  // Mock performance API for resource leak testing
  global.performance = {
    ...global.performance,
    mark: jest.fn(),
    measure: jest.fn(),
    now: jest.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000000,
    },
  };

  // Mock requestAnimationFrame and cancelAnimationFrame
  global.requestAnimationFrame = jest.fn((cb) => {
    return setTimeout(cb, 0);
  });
  
  global.cancelAnimationFrame = jest.fn((id) => {
    clearTimeout(id);
  });

  // Mock MediaQuery for responsive components
  global.matchMedia = jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
});

// Setup before each test for London School TDD
beforeEach(() => {
  // Clear all mock call history but preserve implementations
  jest.clearAllMocks();
  
  // Reset DOM to clean state
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  
  // Reset location
  delete (window as any).location;
  window.location = {
    ...window.location,
    href: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
  } as Location;

  // Reset any global state that might affect tests
  if (typeof window !== 'undefined') {
    window.localStorage.clear();
    window.sessionStorage.clear();
  }
});

// Cleanup after each test
afterEach(() => {
  // Additional cleanup specific to our component lifecycle tests
  jest.useRealTimers();
  
  // Clean up any pending promises or async operations
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
});

// Global error handling for better test debugging
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't fail tests on unhandled rejections, but log them
});

/**
 * London School TDD Utilities
 * Helper functions for interaction testing
 */

// Custom utilities available in all tests
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalledBefore(mock: jest.Mock): R;
      toHaveBeenCalledAfter(mock: jest.Mock): R;
      toHaveInteractionPattern(pattern: string[]): R;
    }
  }
  
  var mockInteractionTracker: {
    track(mockName: string, args: any[]): void;
    getInteractions(): Array<{ mockName: string; args: any[]; timestamp: number }>;
    clear(): void;
    verifyPattern(pattern: string[]): boolean;
  };
}

// Global interaction tracker for London School testing
global.mockInteractionTracker = {
  interactions: [] as Array<{ mockName: string; args: any[]; timestamp: number }>,
  
  track(mockName: string, args: any[]) {
    this.interactions.push({
      mockName,
      args,
      timestamp: Date.now()
    });
  },
  
  getInteractions() {
    return [...this.interactions];
  },
  
  clear() {
    this.interactions = [];
  },
  
  verifyPattern(pattern: string[]) {
    const actualPattern = this.interactions.map(i => i.mockName);
    return JSON.stringify(actualPattern) === JSON.stringify(pattern);
  }
};

/**
 * Mock Factory Utilities
 * Consistent mock creation for London School TDD
 */

// Enhanced mock creation with interaction tracking
export const createTrackedMock = (name: string): jest.Mock => {
  const mock = jest.fn();
  
  // Wrap mock to track all interactions
  const originalImplementation = mock.getMockImplementation();
  mock.mockImplementation((...args) => {
    global.mockInteractionTracker.track(name, args);
    return originalImplementation ? originalImplementation(...args) : undefined;
  });
  
  return mock;
};

// Network mock utilities
export const createNetworkMock = () => ({
  fetch: createTrackedMock('fetch'),
  WebSocket: createTrackedMock('WebSocket'),
  EventSource: createTrackedMock('EventSource'),
});

/**
 * Test Environment Validation
 * Ensure proper test environment for London School TDD
 */
beforeAll(() => {
  // Validate that we have the necessary testing utilities
  const requiredGlobals = [
    'fetch',
    'EventSource',
    'WebSocket',
    'ResizeObserver',
    'IntersectionObserver'
  ];
  
  requiredGlobals.forEach(globalName => {
    if (typeof (global as any)[globalName] === 'undefined') {
      throw new Error(`Missing global mock for ${globalName}. London School TDD requires all external dependencies to be mocked.`);
    }
  });
});

/**
 * Performance Monitoring for Resource Leak Tests
 */
let initialMemoryUsage: number;

beforeAll(() => {
  initialMemoryUsage = process.memoryUsage().heapUsed;
});

afterAll(() => {
  const finalMemoryUsage = process.memoryUsage().heapUsed;
  const memoryDelta = finalMemoryUsage - initialMemoryUsage;
  
  // Log memory usage for resource leak analysis
  console.log(`Memory usage delta: ${memoryDelta} bytes`);
  
  if (memoryDelta > 50 * 1024 * 1024) { // 50MB threshold
    console.warn('Potential memory leak detected in test suite');
  }
});