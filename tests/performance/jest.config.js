/**
 * Jest configuration for performance tests
 */

module.exports = {
  displayName: 'Performance Tests',
  testMatch: ['<rootDir>/tests/performance/**/*.test.js'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/performance/jest.setup.js'],
  testTimeout: 120000, // 2 minutes for performance tests
  maxWorkers: 1, // Run performance tests serially to avoid resource conflicts

  // Coverage configuration
  collectCoverageFrom: [
    'tests/performance/**/*.js',
    '!tests/performance/reports/**',
    '!tests/performance/jest.config.js',
    '!tests/performance/jest.setup.js'
  ],

  // Mock configuration
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'tests/performance/reports',
      outputName: 'performance-test-results.xml'
    }]
  ],

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/performance/global-setup.js',
  globalTeardown: '<rootDir>/tests/performance/global-teardown.js'
};