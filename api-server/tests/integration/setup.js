/**
 * Jest Setup for Integration Tests
 *
 * Configures test environment and global utilities
 */

// Extend Jest matchers with custom assertions
expect.extend({
  toBeValidISO8601(received) {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
    const pass = iso8601Regex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be valid ISO 8601 timestamp`
          : `expected ${received} to be valid ISO 8601 timestamp`
    };
  },

  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be valid UUID`
          : `expected ${received} to be valid UUID`
    };
  },

  toHaveValidEngagement(received) {
    const engagement = typeof received === 'string'
      ? JSON.parse(received)
      : received;

    const hasAllFields =
      typeof engagement.comments === 'number' &&
      typeof engagement.likes === 'number' &&
      typeof engagement.shares === 'number' &&
      typeof engagement.views === 'number';

    const allNonNegative =
      engagement.comments >= 0 &&
      engagement.likes >= 0 &&
      engagement.shares >= 0 &&
      engagement.views >= 0;

    const pass = hasAllFields && allNonNegative;

    return {
      pass,
      message: () =>
        pass
          ? `expected ${JSON.stringify(engagement)} not to be valid engagement object`
          : `expected ${JSON.stringify(engagement)} to be valid engagement object with non-negative numbers`
    };
  }
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Global test utilities
global.testHelpers = {
  /**
   * Wait for a condition to be true
   */
  async waitFor(condition, timeout = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Timeout waiting for condition');
  },

  /**
   * Generate random test data
   */
  randomString(length = 10) {
    return Math.random().toString(36).substring(2, length + 2);
  },

  /**
   * Sleep for specified milliseconds
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// Console suppression during tests (optional)
if (process.env.SUPPRESS_CONSOLE === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
    // Keep error for debugging
  };
}
