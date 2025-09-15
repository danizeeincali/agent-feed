/**
 * Test Setup Configuration
 *
 * Global test configuration and setup for streaming ticker tests
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock IntersectionObserver for components that use it
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock EventSource globally
const MockEventSource = vi.fn().mockImplementation(() => ({
  close: vi.fn(),
  onopen: null,
  onmessage: null,
  onerror: null,
  readyState: 0,
  url: '',
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2,
}));

global.EventSource = MockEventSource;

// Mock fetch globally with default success response
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      success: true,
      data: {}
    }),
    text: () => Promise.resolve(''),
  } as Response)
);

// Mock performance API
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
  },
});

// Setup test environment
beforeAll(() => {
  // Suppress console warnings/errors during tests unless explicitly testing them
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  console.error = (...args: any[]) => {
    // Allow error logs in error-specific tests
    if (args.some(arg => typeof arg === 'string' && arg.includes('TEST_ERROR'))) {
      originalConsoleError(...args);
    }
  };

  console.warn = (...args: any[]) => {
    // Allow warning logs in warning-specific tests
    if (args.some(arg => typeof arg === 'string' && arg.includes('TEST_WARNING'))) {
      originalConsoleWarn(...args);
    }
  };
});

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();

  // Reset fetch mock to default behavior
  (global.fetch as any).mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      success: true,
      data: {}
    }),
    text: () => Promise.resolve(''),
  });

  // Reset performance.now mock
  let mockTime = 0;
  (global.performance.now as any).mockImplementation(() => {
    mockTime += 10; // Increment by 10ms each call
    return mockTime;
  });
});

afterEach(() => {
  // Clean up any remaining timers
  vi.clearAllTimers();

  // Clean up any remaining mocks
  vi.restoreAllMocks();
});

afterAll(() => {
  // Restore original console methods
  vi.restoreAllMocks();
});