/**
 * Jest Configuration for Claude API Timeout TDD Tests
 * Comprehensive test-driven development setup for Claude Code API integration
 */
module.exports = {
  displayName: 'Claude API Timeout TDD',
  rootDir: '../../',
  testMatch: ['<rootDir>/tests/tdd-claude-api/**/*.test.js'],
  testEnvironment: 'node',
  
  // Extended timeouts for thorough testing
  testTimeout: 30000,
  
  // Coverage configuration for 95%+ requirement
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage/tdd-claude-api',
  collectCoverageFrom: [
    'simple-backend.js',
    'src/services/ClaudeProcessManager.{js,ts}',
    'src/services/claude-integration.{js,ts}',
    'src/**/*claude*.{js,ts}',
    '!src/**/*.test.{js,ts}',
    '!src/**/node_modules/**',
    '!coverage/**'
  ],
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // Setup and teardown
  setupFilesAfterEnv: ['<rootDir>/tests/tdd-claude-api/setup.js'],
  globalSetup: '<rootDir>/tests/tdd-claude-api/global-setup.js',
  globalTeardown: '<rootDir>/tests/tdd-claude-api/global-teardown.js',
  
  // Enhanced error reporting
  verbose: true,
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/test-results/tdd-claude-api',
      outputName: 'junit.xml',
      suiteName: 'Claude API Timeout TDD Tests'
    }]
  ],
  
  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Module mapping for absolute imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Avoid conflicts with other test mocks
  modulePathIgnorePatterns: [
    '<rootDir>/tests/__mocks__',
    '<rootDir>/tests/regression/__mocks__'
  ]
};