/**
 * TDD London School Test Setup
 * Mock-first approach with behavior verification
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Configure React Testing Library for London School approach
configure({
  testIdAttribute: 'data-testid',
  // Focus on behavior, not implementation
  asyncUtilTimeout: 5000,
});

// Global mock setup for London School TDD
global.mockFileSystem = null;
global.mockApiClient = null;
global.mockComponentRegistry = null;

// Mock console for clean test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Suppress expected console errors in tests
  console.error = jest.fn((message) => {
    if (
      message.includes('Warning: ') ||
      message.includes('Error: ') ||
      message.includes('Failed to load')
    ) {
      return;
    }
    originalConsoleError(message);
  });
  
  console.warn = jest.fn((message) => {
    if (message.includes('Warning: ')) {
      return;
    }
    originalConsoleWarn(message);
  });
});

afterEach(() => {
  // Restore console after each test
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  
  // Clean up DOM
  document.body.innerHTML = '';
});

// Global test utilities for London School TDD
global.createMockImplementation = (methodName, returnValue) => {
  const mockFn = jest.fn().mockResolvedValue(returnValue);
  mockFn.mockName = methodName;
  return mockFn;
};

global.verifyMockInteractions = (mock, expectedCalls) => {
  expectedCalls.forEach(({ method, args, callIndex = 0 }) => {
    if (method) {
      expect(mock[method]).toHaveBeenCalledWith(...(args || []));
    } else {
      expect(mock).toHaveBeenNthCalledWith(callIndex + 1, ...(args || []));
    }
  });
};

// Mock fetch for all tests
global.fetch = jest.fn();

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};