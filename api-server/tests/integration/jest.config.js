/**
 * Jest Configuration for Post Creation Fix Integration Tests
 *
 * Configured for:
 * - Real database integration testing
 * - London School TDD principles
 * - Comprehensive test reporting
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test match patterns
  testMatch: [
    '**/tests/integration/**/*.test.js'
  ],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Coverage thresholds (TDD best practices)
  coverageThresholds: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    }
  },

  // Files to collect coverage from
  collectCoverageFrom: [
    'server.js',
    'routes/**/*.js',
    'middleware/**/*.js',
    'services/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],

  // Test timeout (increased for integration tests)
  testTimeout: 30000,

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.js'],

  // Verbose output
  verbose: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
