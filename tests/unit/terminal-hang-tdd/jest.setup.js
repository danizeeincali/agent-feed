/**
 * Jest Setup for Terminal Hang TDD Tests
 * London School TDD configuration with proper mocking and timeout handling
 */

// Increase timeout for hanging tests
jest.setTimeout(10000);

// Global console override to capture debug output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

global.testLogs = [];

console.log = (...args) => {
  global.testLogs.push({ level: 'log', message: args.join(' '), timestamp: Date.now() });
  originalConsoleLog(...args);
};

console.error = (...args) => {
  global.testLogs.push({ level: 'error', message: args.join(' '), timestamp: Date.now() });
  originalConsoleError(...args);
};

console.warn = (...args) => {
  global.testLogs.push({ level: 'warn', message: args.join(' '), timestamp: Date.now() });
  originalConsoleWarn(...args);
};

// Mock timers setup
beforeEach(() => {
  // Clear test logs
  global.testLogs = [];
  
  // Setup fake timers for timeout testing
  jest.useFakeTimers();
});

afterEach(() => {
  // Cleanup timers
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  
  // Log test completion
  console.log('🔍 Test completed, logs captured:', global.testLogs.length);
});

// Global mock for WebSocket
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    
    // Simulate connection after short delay
    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) this.onopen();
    }, 100);
  }
  
  send(data) {
    if (this.readyState !== 1) {
      throw new Error('WebSocket is not open');
    }
    // Mock implementation - data is "sent"
    console.log('[MOCK WebSocket] Sent:', data);
  }
  
  close(code, reason) {
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose({ code, reason });
  }
};

// Global mock for PTY
global.mockPty = {
  spawn: jest.fn(() => ({
    pid: 12345,
    write: jest.fn(),
    resize: jest.fn(),
    kill: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
    emit: jest.fn()
  }))
};

// Helper function to create mock promises that never resolve (for hanging tests)
global.createHangingPromise = (description = 'hanging promise') => {
  console.log(`[MOCK] Creating ${description} - will never resolve`);
  return new Promise(() => {
    // This promise never resolves, simulating a hang
  });
};

// Helper function to create timeout promises
global.createTimeoutPromise = (ms, value = 'TIMEOUT') => {
  return new Promise(resolve => {
    setTimeout(() => resolve(value), ms);
  });
};

// London School TDD helper - verify mock interactions
global.verifyMockInteractions = (mockObj, expectedCalls) => {
  const results = {
    passed: 0,
    failed: 0,
    details: []
  };
  
  expectedCalls.forEach(({ method, times, calledWith }) => {
    const mock = mockObj[method];
    if (!mock || !jest.isMockFunction(mock)) {
      results.failed++;
      results.details.push({
        method,
        status: 'FAIL',
        reason: 'Method not mocked or not a mock function'
      });
      return;
    }
    
    if (times !== undefined && mock.mock.calls.length !== times) {
      results.failed++;
      results.details.push({
        method,
        status: 'FAIL',
        reason: `Expected ${times} calls, got ${mock.mock.calls.length}`
      });
      return;
    }
    
    if (calledWith !== undefined) {
      const lastCall = mock.mock.calls[mock.mock.calls.length - 1];
      if (!lastCall || JSON.stringify(lastCall) !== JSON.stringify(calledWith)) {
        results.failed++;
        results.details.push({
          method,
          status: 'FAIL',
          reason: `Expected call with ${JSON.stringify(calledWith)}, got ${JSON.stringify(lastCall)}`
        });
        return;
      }
    }
    
    results.passed++;
    results.details.push({
      method,
      status: 'PASS',
      reason: 'Mock interaction verified'
    });
  });
  
  return results;
};

// Test environment information
console.log('🚨 Terminal Hang TDD Test Environment Initialized');
console.log('🎯 London School TDD Principles Active');
console.log('⏰ Test Timeout:', jest.getTimeout(), 'ms');
console.log('🔧 Fake Timers: Available');
console.log('📋 Global Mocks: WebSocket, PTY, Helper Functions');