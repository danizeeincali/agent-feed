/**
 * Jest Configuration for TokenAnalyticsWriter Service Tests
 * Supports ES Modules with London School TDD patterns
 */

export default {
  // Use node test environment
  testEnvironment: 'node',

  // Transform configuration for ES modules
  transform: {},

  // Test file patterns
  testMatch: [
    '**/tests/services/**/*.test.js'
  ],

  // Clear mocks between tests (London School isolation)
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Timeout for async tests
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Coverage configuration
  collectCoverage: false,

  // Node options for ES modules
  globals: {
    'ts-jest': {
      useESM: true
    }
  },

  // Force exit after tests
  forceExit: true,

  // Test environment options
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
};
