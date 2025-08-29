/**
 * Jest Setup for Escape Sequence Storm TDD Tests
 * 
 * This setup file prepares the testing environment for tests that SHOULD FAIL,
 * demonstrating the current broken behavior before implementing fixes.
 */

import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import React from 'react';

// Global React mock for components that use hooks
global.React = React;

// Suppress console warnings during tests (we expect failures)
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  // Only suppress React/testing library warnings, keep real errors
  const message = args[0];
  if (
    typeof message === 'string' && (
      message.includes('Warning:') ||
      message.includes('React Hook') ||
      message.includes('act(...)')
    )
  ) {
    return;
  }
  originalConsoleError(...args);
};

console.warn = (...args) => {
  const message = args[0];
  if (
    typeof message === 'string' && (
      message.includes('componentWillMount') ||
      message.includes('componentWillReceiveProps') ||
      message.includes('componentWillUpdate')
    )
  ) {
    return;
  }
  originalConsoleWarn(...args);
};

// Mock timers for debouncing tests
beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.clearAllTimers();
});

// Global test utilities
global.testUtils = {
  // Simulate rapid user interactions
  simulateRapidClicks: (element, count = 5) => {
    for (let i = 0; i < count; i++) {
      fireEvent.click(element);
    }
  },
  
  // Simulate escape sequences
  createEscapeSequence: (type = 'clear') => {
    const sequences = {
      clear: '\x1b[2J\x1b[H',
      color: '\x1b[31mRed\x1b[0m',
      altBuffer: '\x1b[?1049h',
      mainBuffer: '\x1b[?1049l',
      hideCursor: '\x1b[?25l',
      showCursor: '\x1b[?25h'
    };
    return sequences[type] || sequences.clear;
  },
  
  // Create mock SSE event
  createMockSSEEvent: (data, type = 'output') => ({
    data: JSON.stringify({
      type,
      data,
      isReal: true,
      instanceId: 'test-instance',
      timestamp: new Date().toISOString()
    })
  }),
  
  // Wait for async operations with timeout
  waitForAsync: (condition, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (condition()) {
          resolve(true);
        } else if (Date.now() - start > timeout) {
          reject(new Error(`Timeout waiting for condition after ${timeout}ms`));
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  },
  
  // Memory usage tracking mock
  trackMemoryUsage: () => {
    const snapshots = [];
    return {
      snapshot: () => {
        snapshots.push({
          timestamp: Date.now(),
          usage: Math.random() * 100000000 // Mock memory usage
        });
      },
      getGrowth: () => {
        if (snapshots.length < 2) return 0;
        return snapshots[snapshots.length - 1].usage - snapshots[0].usage;
      },
      snapshots
    };
  }
};

// Mock node modules that aren't available in jsdom
jest.mock('node-pty', () => ({
  spawn: jest.fn(() => ({
    kill: jest.fn(),
    resize: jest.fn(),
    write: jest.fn(),
    onData: jest.fn(),
    onExit: jest.fn(),
    pid: Math.floor(Math.random() * 10000)
  }))
}));

jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    pid: Math.floor(Math.random() * 10000),
    kill: jest.fn(),
    killed: false,
    on: jest.fn(),
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    stdin: { write: jest.fn() }
  }))
}));

// Mock EventSource for SSE tests
global.EventSource = jest.fn(() => ({
  close: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2,
  onopen: null,
  onmessage: null,
  onerror: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn()
}));

// Mock fetch for API tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      success: true,
      instances: [],
      instanceId: `test-${Date.now()}`
    }),
    text: () => Promise.resolve(''),
    status: 200,
    statusText: 'OK'
  })
);

// Mock WebSocket (should not be used, but included for safety)
global.WebSocket = jest.fn(() => ({
  close: jest.fn(),
  send: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
  onopen: null,
  onmessage: null,
  onerror: null,
  onclose: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));

// Enhanced error tracking for test analysis
let testErrors = [];

const originalError = global.Error;
global.Error = class extends originalError {
  constructor(message) {
    super(message);
    testErrors.push({
      message,
      stack: this.stack,
      timestamp: Date.now()
    });
  }
};

global.getTestErrors = () => testErrors;
global.clearTestErrors = () => { testErrors = []; };

// Mock performance API for timing tests
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => [])
};

// Mock IntersectionObserver (used by some React components)
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Test environment validation
console.log('🧪 Escape Sequence Storm TDD Test Environment Ready');
console.log('📋 These tests SHOULD FAIL initially - they demonstrate broken behavior');
console.log('🔧 After implementing fixes, these tests should pass');

export default {};