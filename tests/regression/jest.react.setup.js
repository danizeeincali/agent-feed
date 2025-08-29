/**
 * Jest Setup for React Components
 * 
 * Configures React Testing Library and prevents deprecation warnings
 */

// Import required polyfills for jsdom
import 'whatwg-fetch';
import { TextEncoder, TextDecoder } from 'util';

// Set up global objects
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(cb) {
    this.cb = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Suppress React 18 warnings in test environment
const originalError = console.error;
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    // Filter out React 18 specific warnings that are expected in test environment
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('Warning: ReactDOM.render is deprecated') ||
       message.includes('Warning: findDOMNode is deprecated') ||
       message.includes('act(...) is not supported in production'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  });
});

afterAll(() => {
  console.error.mockRestore();
});

// Configure React Testing Library
import { configure } from '@testing-library/react';

configure({
  // Configure testing library to avoid deprecation warnings
  testIdAttribute: 'data-testid',
});

// Global cleanup for React components
afterEach(async () => {
  // Clean up any remaining React trees
  const { cleanup } = await import('@testing-library/react');
  cleanup();
});