/**
 * Jest Configuration for Claude Code VPS + AgentLink TDD Framework
 * London School TDD with Mock-Driven Development
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Root directories
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.{js,ts}',
    '**/tests/**/*.spec.{js,ts}',
    '**/__tests__/**/*.{js,ts}'
  ],
  
  // Module path mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@mocks/(.*)$': '<rootDir>/tests/mocks/$1',
    '^@fixtures/(.*)$': '<rootDir>/tests/fixtures/$1',
    '^@factories/(.*)$': '<rootDir>/tests/factories/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/helpers/setup.js',
    '<rootDir>/tests/helpers/mock-setup.js'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/index.{js,ts}',
    '!src/**/*.config.{js,ts}'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/agents/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/api/': {
      branches: 88,
      functions: 92,
      lines: 92,
      statements: 92
    }
  },
  
  // Test timeouts
  testTimeout: 10000,
  
  // Transform configuration
  transform: {
    '^.+\\.(js|ts)$': 'babel-jest'
  },
  
  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Test environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  
  // Global setup and teardown
  globalSetup: '<rootDir>/tests/helpers/global-setup.js',
  globalTeardown: '<rootDir>/tests/helpers/global-teardown.js',
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml'
    }],
    ['jest-html-reporters', {
      publicPath: 'test-results',
      filename: 'report.html'
    }]
  ],
  
  // Watch mode configuration
  watchman: true,
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/test-results/'
  ]
};