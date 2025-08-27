/**
 * Jest setup file for real Claude process tests
 * Configures test environment and global mocks
 */

// Increase timeout for integration tests
jest.setTimeout(10000);

// Global test utilities
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

global.waitForEvent = (emitter, eventName, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeout);
    
    emitter.once(eventName, (...args) => {
      clearTimeout(timer);
      resolve(args);
    });
  });
};

// Mock console methods to reduce test noise
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

// Restore console for debugging if needed
global.restoreConsole = () => {
  global.console = originalConsole;
};

// Clean up between tests
afterEach(() => {
  // Clear all timers
  jest.clearAllTimers();
  
  // Reset console mocks
  jest.clearAllMocks();
});

beforeAll(() => {
  // Global setup
  console.log('🧪 Starting Real Claude Process Test Suite');
});

afterAll(() => {
  // Global cleanup
  console.log('✅ Real Claude Process Test Suite Complete');
});