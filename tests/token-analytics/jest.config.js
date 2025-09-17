/**
 * Jest Configuration for Token Analytics Testing
 * Ensures 100% real data validation with strict anti-fake-data measures
 */

module.exports = {
  displayName: 'Token Analytics Tests',
  testEnvironment: 'node',
  roots: ['<rootDir>/unit', '<rootDir>/integration'],
  testMatch: [
    '**/__tests__/**/*.{js,ts}',
    '**/*.(test|spec).{js,ts}'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  setupFilesAfterEnv: [
    '<rootDir>/setup/jest.setup.js'
  ],
  collectCoverageFrom: [
    '../src/**/*.{js,ts}',
    '!../src/**/*.d.ts',
    '!../src/**/index.js'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  // Custom matchers for fake data detection
  globalSetup: '<rootDir>/setup/global-setup.js',
  globalTeardown: '<rootDir>/setup/global-teardown.js',

  // Fail tests immediately if fake data is detected
  bail: false,
  verbose: true,

  // Environment variables for testing
  setupFiles: ['<rootDir>/setup/env.js'],

  // Custom reporters for fake data violations
  reporters: [
    'default',
    ['<rootDir>/reporters/fake-data-reporter.js', {}]
  ],

  // Test timeout - real API calls may take time
  testTimeout: 30000,

  // Module paths for token analytics
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../src/$1',
    '^@tests/(.*)$': '<rootDir>/$1'
  }
};