/**
 * Jest setup for TDD London School tests
 */

import '@testing-library/jest-dom';

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Extend Jest matchers for better debugging
expect.extend({
  toHaveBeenCalledWithURL(received, expected) {
    const calls = received.mock.calls;
    const urlCall = calls.find(call => call[0]?.includes?.(expected));
    
    if (urlCall) {
      return {
        message: () => `Expected function not to be called with URL containing "${expected}"`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected function to be called with URL containing "${expected}". Actual calls: ${JSON.stringify(calls)}`,
        pass: false,
      };
    }
  },
});