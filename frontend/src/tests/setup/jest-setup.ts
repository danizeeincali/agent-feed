/**
 * Jest Setup Configuration for London School TDD
 * Configures testing environment with proper mocking capabilities
 */

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { server } from '../mocks/server';

// Global polyfills for Node.js environment
Object.assign(global, { TextDecoder, TextEncoder });

// Mock WebSocket for Node.js environment
class MockWebSocket {
  onopen?: (event: Event) => void;
  onclose?: (event: CloseEvent) => void;
  onmessage?: (event: MessageEvent) => void;
  onerror?: (event: Event) => void;
  readyState: number = 1; // OPEN
  url: string;
  
  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.onopen?.({} as Event);
    }, 0);
  }
  
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    // Mock implementation
  }
  
  close() {
    setTimeout(() => {
      this.onclose?.({} as CloseEvent);
    }, 0);
  }
}

global.WebSocket = MockWebSocket as any;

// Mock fetch for HTTP requests
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Setup MSW server for API mocking
beforeAll(() => {
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
  jest.clearAllMocks();
});

afterAll(() => {
  server.close();
});

// Suppress console errors during tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
