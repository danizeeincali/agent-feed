/**
 * Jest Configuration for API Connectivity Tests
 * Configured for testing against real servers - NO MOCKS
 */

export default {
  displayName: 'API Connectivity Tests',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/api-connectivity/**/*.test.js'
  ],
  testTimeout: 30000,
  setupFilesAfterEnv: [
    '<rootDir>/tests/api-connectivity/setup.js'
  ],
  collectCoverage: false, // Disable coverage for integration tests
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1, // Run tests sequentially to avoid overwhelming servers

  // Environment variables for tests
  testEnvironment: 'node',
  globals: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173'
  },

  // Retry failed tests once (network requests can be flaky)
  retry: 1,

  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Module configuration
  moduleFileExtensions: ['js', 'json'],

  // Test result processor
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: 'api-connectivity-results.xml',
        suiteName: 'API Connectivity Tests'
      }
    ]
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/.next/'
  ],

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Error handling
  errorOnDeprecated: false,
  bail: false, // Don't stop on first failure

  // Logging
  silent: false,
  logHeapUsage: true
};