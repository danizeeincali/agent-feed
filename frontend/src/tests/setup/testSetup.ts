/**
 * Test Setup Configuration for London School TDD
 * Global test configuration and mock setup
 */

import '@testing-library/jest-dom';
import { MockWebSocket } from '../mocks/MockWebSocket';

// Mock window.matchMedia which is not implemented in JSDOM
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

// Mock ResizeObserver which is not available in test environment
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

// Mock WebSocket with our enhanced MockWebSocket
global.WebSocket = MockWebSocket as any;

// Global test configuration
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset WebSocket mock instances
  MockWebSocket.reset();
});

afterEach(() => {
  // Clean up timers
  jest.clearAllTimers();
  
  // Reset WebSocket instances
  MockWebSocket.reset();
});

// Mock canvas context for xterm
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(),
  putImageData: jest.fn(),
  createImageData: jest.fn(),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
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

// Set up fetch mock
global.fetch = jest.fn();

// Global test utilities
global.TestUtils = {
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

// Add custom matchers for London School TDD
expect.extend({
  toHaveBeenCalledAfter(received: jest.MockedFunction<any>, other: jest.MockedFunction<any>) {
    const receivedCalls = received.mock.invocationCallOrder;
    const otherCalls = other.mock.invocationCallOrder;
    
    if (receivedCalls.length === 0 || otherCalls.length === 0) {
      return {
        message: () => 'Both functions must have been called',
        pass: false,
      };
    }
    
    const lastReceivedCall = Math.max(...receivedCalls);
    const lastOtherCall = Math.max(...otherCalls);
    const pass = lastReceivedCall > lastOtherCall;
    
    return {
      message: () => 
        pass
          ? `Expected ${received.getMockName()} not to be called after ${other.getMockName()}`
          : `Expected ${received.getMockName()} to be called after ${other.getMockName()}`,
      pass,
    };
  },
  
  toHaveInteractedWith(received: any, mockObject: any) {
    const interactions = Object.keys(mockObject).filter(key => 
      typeof mockObject[key] === 'function' && mockObject[key].mock?.calls?.length > 0
    );
    
    const pass = interactions.length > 0;
    
    return {
      message: () => 
        pass
          ? `Expected no interactions with mock object`
          : `Expected interactions with mock object, but found none`,
      pass,
    };
  }
});

// Declare global types for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalledAfter(other: jest.MockedFunction<any>): R;
      toHaveInteractedWith(mockObject: any): R;
    }
  }
  
  var TestUtils: {
    waitFor: (condition: () => boolean, timeout?: number) => Promise<void>;
    flushPromises: () => Promise<void>;
  };
}

// Increase test timeout for complex integration tests
jest.setTimeout(30000);