/**
 * Vitest Setup Configuration
 * Configures testing environment for analytics tests
 */

// Import vi from vitest first
import { vi } from 'vitest';

// Use the standard import that exists
import '@testing-library/jest-dom';

// Mock window.performance for consistent testing
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByType: vi.fn(() => []),
    memory: {
      usedJSHeapSize: 1024 * 1024 * 10, // 10MB
      totalJSHeapSize: 1024 * 1024 * 50, // 50MB
      jsHeapSizeLimit: 1024 * 1024 * 100 // 100MB
    }
  }
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 16); // ~60fps
  return 1;
});

global.cancelAnimationFrame = vi.fn();

// Mock window.matchMedia which is not implemented in JSDOM
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

// Mock ResizeObserver which is not available in test environment
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock PerformanceObserver
global.PerformanceObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  disconnect: vi.fn()
}));

// Mock EventSource for SSE testing
global.EventSource = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
  readyState: 1,
  url: '',
  withCredentials: false,
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2
}));

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
  readyState: 1,
  url: '',
  protocol: '',
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}));

// Set up fetch mock
global.fetch = vi.fn();

// Mock canvas context for xterm
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
}));

// Suppress specific console warnings that are expected in test environment
const originalError = console.error;
console.error = (...args: any[]) => {
  const message = args.join(' ');

  // Suppress known test environment warnings
  if (
    message.includes('Warning: validateDOMNesting') ||
    message.includes('Warning: React.jsx') ||
    message.includes('Warning: Each child in a list') ||
    message.includes('act(() => { ... })') ||
    message.includes('Warning: ReactDOM.render') ||
    message.includes('Not implemented: HTMLCanvasElement.prototype.getContext') ||
    message.includes('Warning: An update to') ||
    message.includes('inside a test was not wrapped in act') ||
    message.includes('ReactDOMTestUtils.act')
  ) {
    return;
  }

  originalError(...args);
};

// Global test utilities
const TestUtils = {
  waitFor: (condition: () => boolean, timeout: number = 5000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkCondition = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Condition not met within ${timeout}ms`));
        } else {
          setTimeout(checkCondition, 10);
        }
      };
      checkCondition();
    });
  },

  flushPromises: (): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, 0));
  }
};

// Make TestUtils globally available
(globalThis as any).TestUtils = TestUtils;

// Declare global types for TypeScript
declare global {
  var TestUtils: {
    waitFor: (condition: () => boolean, timeout?: number) => Promise<void>;
    flushPromises: () => Promise<void>;
  };
}