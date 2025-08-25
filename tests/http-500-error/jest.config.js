/**
 * Jest Configuration for HTTP 500 Error Tests
 * Configured for comprehensive testing of backend endpoints and error scenarios
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/http-500-error/**/*.test.js',
    '**/tests/http-500-error/**/*.test.jsx',
    '**/tests/http-500-error/**/*.test.ts',
    '**/tests/http-500-error/**/*.test.tsx'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'backend-terminal-server.js',
    'simple-server.js',
    'src/**/*.{js,jsx,ts,tsx}',
    'frontend/src/**/*.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/build/**'
  ],
  
  coverageReporters: [
    'text',
    'html',
    'lcov',
    'json-summary'
  ],
  
  coverageDirectory: 'coverage/http-500-errors',
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/http-500-error/setup.js'
  ],
  
  // Module name mapping for aliases
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@frontend/(.*)$': '<rootDir>/frontend/src/$1',
    '^@components/(.*)$': '<rootDir>/frontend/src/components/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json',
    'node'
  ],
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'http-500-error-junit.xml',
      suiteName: 'HTTP 500 Error Tests'
    }]
  ],
  
  // Global setup and teardown
  globalSetup: '<rootDir>/tests/http-500-error/global-setup.js',
  globalTeardown: '<rootDir>/tests/http-500-error/global-teardown.js',
  
  // Test categories with different configurations
  projects: [
    {
      displayName: 'Backend API Tests',
      testMatch: ['**/tests/http-500-error/backend-*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/http-500-error/backend-setup.js']
    },
    {
      displayName: 'PTY Integration Tests', 
      testMatch: ['**/tests/http-500-error/pty-*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/http-500-error/pty-setup.js']
    },
    {
      displayName: 'Network Tests',
      testMatch: ['**/tests/http-500-error/network-*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/http-500-error/network-setup.js']
    },
    {
      displayName: 'React Component Tests',
      testMatch: ['**/tests/http-500-error/react-*.test.tsx'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: [
        '<rootDir>/tests/http-500-error/react-setup.js',
        '@testing-library/jest-dom'
      ]
    },
    {
      displayName: 'Mock Server Tests',
      testMatch: ['**/tests/http-500-error/mock-server*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/http-500-error/mock-setup.js']
    },
    {
      displayName: 'Terminal Spawn Tests',
      testMatch: ['**/tests/http-500-error/terminal-spawn*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/http-500-error/spawn-setup.js']
    }
  ]
};