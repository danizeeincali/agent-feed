// Test setup file for regression tests

// Extend Jest matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Global test configuration
global.console = {
  ...console,
  // Suppress console.log during tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
};

// Setup global variables
global.TEST_TIMEOUT = 30000;
global.API_BASE_URL = 'http://localhost:3000';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Global test utilities
global.testUtils = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  retry: async (fn, maxAttempts = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        await global.testUtils.delay(delay);
      }
    }
  },

  waitForServer: async (url, timeout = 30000) => {
    const axios = require('axios');
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        await axios.get(url, { timeout: 5000 });
        return true;
      } catch (error) {
        await global.testUtils.delay(1000);
      }
    }

    throw new Error(`Server at ${url} did not become available within ${timeout}ms`);
  }
};