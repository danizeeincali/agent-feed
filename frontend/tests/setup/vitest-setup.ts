/**
 * Vitest Setup Configuration
 * Global setup for unit and integration tests
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Extend Vitest matchers
import 'vitest-dom/extend-expect';

// Mock WebSocket globally for unit tests
global.WebSocket = class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string | ArrayBuffer | Blob | ArrayBufferView): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    // Echo back for testing
    if (this.onmessage) {
      setTimeout(() => {
        this.onmessage!({
          data: typeof data === 'string' ? data : 'binary-data',
          type: 'message'
        } as MessageEvent);
      }, 10);
    }
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({
        code: code || 1000,
        reason: reason || '',
        wasClean: true,
        type: 'close'
      } as CloseEvent);
    }
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    // Simple implementation for testing
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    // Simple implementation for testing  
  }

  dispatchEvent(event: Event): boolean {
    return true;
  }
};

// Mock fetch globally
global.fetch = vi.fn();

// Setup environment variables for testing
process.env.NODE_ENV = 'test';
process.env.VITE_API_URL = process.env.VITE_API_URL || 'http://localhost:3003';
process.env.VITE_WS_URL = process.env.VITE_WS_URL || 'ws://localhost:3004';

// Global test setup
beforeAll(async () => {
  // Setup any global test configuration
  console.log('🧪 Setting up test environment...');
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Global test teardown
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
});

// Increase test timeout for integration tests
if (process.env.TEST_TYPE === 'integration') {
  vi.setConfig({
    testTimeout: 60000,
    hookTimeout: 60000
  });
}

// Mock console methods for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.error = vi.fn();
  console.warn = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Helper utilities for tests
export const testUtils = {
  /**
   * Wait for a specified amount of time
   */
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Mock implementation for fetch requests
   */
  mockFetch: (response: any, status: number = 200) => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: async () => response,
      text: async () => JSON.stringify(response),
      headers: new Map(),
    });
  },

  /**
   * Mock fetch error
   */
  mockFetchError: (error: Error) => {
    (global.fetch as any).mockRejectedValueOnce(error);
  },

  /**
   * Create a mock WebSocket with custom behavior
   */
  createMockWebSocket: (overrides: Partial<WebSocket> = {}) => {
    return Object.assign(new global.WebSocket('ws://test'), overrides);
  },

  /**
   * Mock terminal output for testing
   */
  mockTerminalOutput: (output: string, delay: number = 100) => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(output);
      }, delay);
    });
  }
};

// Export for use in tests
export { vi } from 'vitest';