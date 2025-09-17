/**
 * Vitest Test Setup
 * Global test configuration and mocks for Avi DM test suite
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global mocks
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
});

// Mock fetch globally
global.fetch = vi.fn();

// Mock FileReader
const mockFileReader = {
  readAsDataURL: vi.fn(),
  result: '',
  onload: null as any,
  onerror: null as any,
};

vi.stubGlobal('FileReader', vi.fn(() => mockFileReader));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock console for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = vi.fn();
  console.warn = vi.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
  vi.resetAllMocks();
});

// Custom matchers for better assertions
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Extend expect types
declare global {
  namespace Vi {
    interface AsymmetricMatchersContaining {
      toBeWithinRange(floor: number, ceiling: number): any;
    }
  }
}

// Setup environment variables for testing
process.env.NODE_ENV = 'test';
process.env.VITEST = 'true';