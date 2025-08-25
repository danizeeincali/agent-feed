import { expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock global objects that aren't available in jsdom
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
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
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

// Extend Vitest's expect with jest-dom matchers
// This is already done by importing '@testing-library/jest-dom/vitest'

// Mock console methods by default to reduce noise in tests
// Individual tests can override these if they need to test console output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeEach(() => {
  // Only mock console if not already mocked by test
  if (!vi.isMockFunction(console.error)) {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  }
  if (!vi.isMockFunction(console.warn)) {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  }
  // Don't mock console.log by default as it's useful for debugging
});