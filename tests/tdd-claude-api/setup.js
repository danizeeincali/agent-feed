/**
 * TDD Test Setup for Claude API Timeout Testing
 * London School TDD approach with comprehensive mocking
 */

const { EventEmitter } = require('events');

// Global test utilities
global.testUtils = {
  // Mock process creation utilities
  createMockProcess: (options = {}) => {
    const mockProcess = new EventEmitter();
    mockProcess.pid = options.pid || Math.floor(Math.random() * 10000);
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.stdin = {
      write: jest.fn(),
      end: jest.fn()
    };
    mockProcess.kill = jest.fn();
    mockProcess.killed = false;
    mockProcess.exitCode = null;
    
    // Simulate timeout behavior if specified
    if (options.timeout) {
      setTimeout(() => {
        mockProcess.emit('error', new Error('TIMEOUT'));
      }, options.timeout);
    }
    
    // Simulate successful completion if specified
    if (options.success) {
      setTimeout(() => {
        mockProcess.stdout.emit('data', options.successData || 'Claude AI is ready');
        mockProcess.emit('exit', 0);
      }, options.successDelay || 100);
    }
    
    return mockProcess;
  },
  
  // Mock claude command variations
  mockClaudeCommands: {
    working: ['claude', '--version'],
    timeout: ['claude', 'prompt-that-times-out'],
    interactive: ['claude'],
    skipPermissions: ['claude', '--dangerously-skip-permissions']
  },
  
  // Timeout test scenarios
  timeoutScenarios: [
    { name: '5s timeout', timeout: 5000 },
    { name: '10s timeout', timeout: 10000 },
    { name: '15s timeout', timeout: 15000 },
    { name: '30s timeout', timeout: 30000 }
  ],
  
  // Large prompt scenarios
  largePrompts: {
    small: 'A'.repeat(100),
    medium: 'A'.repeat(1000), 
    large: 'A'.repeat(10000),
    xlarge: 'A'.repeat(50000)
  }
};

// Mock child_process spawn globally
jest.mock('child_process', () => ({
  spawn: jest.fn(),
  exec: jest.fn(),
  execSync: jest.fn()
}));

// Mock node-pty for terminal testing
jest.mock('node-pty', () => ({
  spawn: jest.fn()
}));

// Enhanced matchers for timeout testing
expect.extend({
  toTimeoutWithin(received, timeLimit) {
    const startTime = Date.now();
    let timedOut = false;
    
    return received.catch(() => {
      const elapsed = Date.now() - startTime;
      timedOut = elapsed <= timeLimit;
      
      return {
        message: () => `Expected promise to timeout within ${timeLimit}ms, but took ${elapsed}ms`,
        pass: timedOut
      };
    });
  },
  
  toCompleteWithin(received, timeLimit) {
    const startTime = Date.now();
    
    return received.then(() => {
      const elapsed = Date.now() - startTime;
      const completed = elapsed <= timeLimit;
      
      return {
        message: () => `Expected promise to complete within ${timeLimit}ms, but took ${elapsed}ms`,
        pass: completed
      };
    });
  }
});

// Setup console tracking for debugging
const originalConsole = { ...console };
global.consoleLogs = [];
global.consoleErrors = [];

beforeEach(() => {
  global.consoleLogs = [];
  global.consoleErrors = [];
  
  console.log = (...args) => {
    global.consoleLogs.push(args.join(' '));
    originalConsole.log(...args);
  };
  
  console.error = (...args) => {
    global.consoleErrors.push(args.join(' '));
    originalConsole.error(...args);
  };
});

afterEach(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  
  // Clean up any hanging processes
  jest.clearAllMocks();
});