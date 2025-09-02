/**
 * Jest Configuration for London School TDD Tests
 * 
 * Optimized for behavior-driven testing with comprehensive mocking capabilities
 */

const path = require('path');

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '**/tests/tdd-london-school/**/*.test.{js,ts,tsx}',
    '**/tests/tdd-london-school/**/*.spec.{js,ts,tsx}'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/setup/jest.setup.ts'
  ],
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../../frontend/src/$1',
    '^@tests/(.*)$': '<rootDir>/../../tests/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/../../frontend/tsconfig.json',
      jsx: 'react-jsx'
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }]
  },
  
  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx', 
    'js',
    'jsx',
    'json'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/../../coverage/tdd-london-school',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  // Coverage thresholds for London School TDD
  coverageThreshold: {
    global: {
      // London School focuses on behavior coverage, not line coverage
      // Lower thresholds since we focus on interaction testing
      branches: 70,
      functions: 75,
      lines: 70,
      statements: 70
    },
    // Specific thresholds for lifecycle tests
    './tests/tdd-london-school/instance-lifecycle/': {
      branches: 85,
      functions: 90,
      lines: 80,
      statements: 80
    }
  },
  
  // Files to collect coverage from
  collectCoverageFrom: [
    '<rootDir>/../../frontend/src/components/**/*.{ts,tsx}',
    '<rootDir>/../../frontend/src/hooks/**/*.{ts,tsx}',
    '<rootDir>/../../frontend/src/managers/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.stories.{ts,tsx}',
    '!**/node_modules/**'
  ],
  
  // Mock configuration
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // Timeout for async tests
  testTimeout: 10000,
  
  // Verbose output for London School interaction verification
  verbose: true,
  
  // Custom test results processor for London School reporting
  testResultsProcessor: '<rootDir>/setup/results-processor.js',
  
  // Global setup and teardown
  globalSetup: '<rootDir>/setup/global-setup.ts',
  globalTeardown: '<rootDir>/setup/global-teardown.ts',
  
  // Error handling
  bail: 0, // Don't bail on first error - see all interaction failures
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/'
  ],
  
  // Reporters for London School methodology
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/coverage/tdd-london-school/html-report',
        filename: 'london-school-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'London School TDD Test Results',
        logoImgPath: undefined,
        includeFailureMsg: true
      }
    ]
  ],
  
  // Custom test environment setup
};