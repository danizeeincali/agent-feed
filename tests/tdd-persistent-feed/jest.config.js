/**
 * London School TDD Configuration for Persistent Feed System
 * Mock-driven, behavior-focused testing approach
 */

module.exports = {
  displayName: 'TDD Persistent Feed',
  testEnvironment: 'node',
  rootDir: '../..',
  testMatch: ['<rootDir>/tests/tdd-persistent-feed/**/*.test.js'],
  setupFilesAfterEnv: [
    '<rootDir>/tests/tdd-persistent-feed/setup/jest.setup.js',
    '<rootDir>/tests/custom-matchers.js'
  ],
  
  // London School TDD specific configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Mock all external dependencies by default
  automock: false,
  
  // Coverage for behavior verification
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage/tdd-persistent-feed',
  coverageReporters: ['text', 'lcov', 'json'],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85
    }
  },
  
  // Module mapping for mocks
  moduleNameMap: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  
  // Test timeout for integration tests
  testTimeout: 30000,
  
  // Verbose output for TDD feedback
  verbose: true,
  
  // Verbose output for TDD feedback
  verbose: true
};
