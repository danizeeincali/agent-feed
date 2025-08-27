/**
 * Jest Setup for Claude Interaction TDD Tests
 * London School TDD Configuration
 */

// Global mocks for all tests
global.mockEventEmitter = require('events').EventEmitter;

// Setup global timeout for async operations
jest.setTimeout(15000);

// Mock console methods to reduce noise during testing
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test helpers
global.createMockProcess = (overrides = {}) => {
  const mockProcess = new global.mockEventEmitter();
  mockProcess.pid = 12345;
  mockProcess.stdout = new global.mockEventEmitter();
  mockProcess.stderr = new global.mockEventEmitter();
  mockProcess.stdin = {
    write: jest.fn(),
    end: jest.fn(),
    destroy: jest.fn()
  };
  mockProcess.kill = jest.fn();
  mockProcess.killed = false;
  
  return { ...mockProcess, ...overrides };
};

global.createMockPtyProcess = (overrides = {}) => {
  return {
    pid: 12346,
    onData: jest.fn(),
    onExit: jest.fn(),
    write: jest.fn(),
    resize: jest.fn(),
    kill: jest.fn(),
    process: 'claude',
    ...overrides
  };
};

// London School: Helper for verifying interaction sequences
global.verifyInteractionSequence = (tracker, expectedSequence) => {
  const actualCalls = tracker.mock.calls;
  const actualSequence = actualCalls.map(call => call[0]);
  
  expect(actualSequence).toEqual(expectedSequence);
};

// Setup and teardown helpers
beforeAll(() => {
  // Global setup
});

afterAll(() => {
  // Global cleanup
});

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});