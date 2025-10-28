/**
 * Jest Configuration for Λvi System Identity Tests
 *
 * Configuration optimized for TDD with real backend testing (NO MOCKS).
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    'workers/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**'
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov'
  ],

  // Test timeout (longer for integration tests with real backend)
  testTimeout: 30000,

  // Verbose output for debugging
  verbose: true,

  // Clear mocks between tests (even though we don't use mocks)
  clearMocks: true,

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Module paths
  modulePaths: ['<rootDir>'],

  // Transform (if using babel)
  // transform: {
  //   '^.+\\.js$': 'babel-jest'
  // },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/build/'
  ],

  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',

  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ]
  ],

  // Global setup/teardown
  // globalSetup: '<rootDir>/tests/global-setup.js',
  // globalTeardown: '<rootDir>/tests/global-teardown.js',

  // Max workers (adjust based on system)
  maxWorkers: '50%',

  // Detect open handles
  detectOpenHandles: true,

  // Force exit after tests complete
  forceExit: false,

  // Bail on first failure (useful for TDD)
  bail: false,

  // Display individual test results
  displayName: {
    name: 'Λvi Tests',
    color: 'cyan'
  }
};
