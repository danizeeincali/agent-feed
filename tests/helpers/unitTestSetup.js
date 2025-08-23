/**
 * Simple Unit Test Setup for London School TDD
 * 
 * Minimal setup without swarm dependencies for unit testing
 */

// Configure Jest environment
jest.setTimeout(30000);

// Mock console for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error // Keep error for debugging
};

// Clean setup and teardown
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  jest.resetModules();
});

afterEach(() => {
  // Clean up timers
  jest.clearAllTimers();
  jest.useRealTimers();
});

// Global error handling
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});