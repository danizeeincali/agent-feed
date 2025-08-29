/**
 * Jest Configuration for TDD London School Regression Test Suite
 * 
 * Optimized for:
 * - Fast execution with comprehensive mocking
 * - High coverage requirements for critical paths
 * - Isolated test environment for deterministic results
 * - London School TDD methodology compliance
 */

module.exports = {
  // Test environment - use jsdom to support React component tests
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    // Set higher EventEmitter listener limit to prevent warnings
    eventEmitterLimit: 50
  },
  
  // Test file patterns
  testMatch: [
    '<rootDir>/**/*.test.js',
    '<rootDir>/**/*.spec.js',
    '<rootDir>/**/*.test.ts',
    '<rootDir>/**/*.test.tsx'
  ],
  
  // Test directories
  roots: [
    '<rootDir>'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    '../../src/**/*.{js,ts}',
    '../../simple-backend.js',
    '../../src/real-claude-backend.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/*.d.ts'
  ],
  
  // Coverage thresholds - strict for regression protection
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85
    },
    // Critical files require higher coverage
    '../../src/real-claude-backend.js': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    '../../simple-backend.js': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  // Output directory for coverage reports
  coverageDirectory: '<rootDir>/coverage',
  
  // Setup and teardown
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  
  // Module path mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../../src/$1',
    '^@tests/(.*)$': '<rootDir>/$1',
    '^child_process$': '<rootDir>/__mocks__/child_process.js',
    '^fs$': '<rootDir>/__mocks__/fs.js',
    '^node-pty$': '<rootDir>/__mocks__/node-pty.js'
    // Note: Removed path mock as it interferes with Jest's internal path.dirname usage
  },
  
  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.ts$': 'ts-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: [
    'js',
    'ts',
    'json'
  ],
  
  // Test timeout (London School tests should be fast)
  testTimeout: 10000,
  
  // Verbose output for detailed feedback
  verbose: true,
  
  // Clear mocks between tests for isolation
  clearMocks: true,
  restoreMocks: true,
  
  // Mock configuration
  automock: false,
  
  // Global setup/teardown
  globalSetup: '<rootDir>/jest.globalSetup.js',
  globalTeardown: '<rootDir>/jest.globalTeardown.js',
  
  // Error handling
  errorOnDeprecated: true,
  
  // Watch mode configuration
  watchman: true,
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/../../node_modules/'
  ],
  
  // Reporters for CI/CD integration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: 'regression-test-results.xml',
        suiteName: 'TDD London School Regression Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        includeConsoleOutput: true
      }
    ],
    // Optional: Add jest-html-reporters if available
    // [
    //   'jest-html-reporters',
    //   {
    //     publicDir: '<rootDir>/test-results',
    //     filename: 'regression-test-report.html',
    //     expand: true,
    //     hideIcon: false,
    //     pageTitle: 'Claude Process Regression Test Report'
    //   }
    // ]
  ],
  
  // London School TDD specific configurations
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/__mocks__/'
  ],
  
  // Force exit to prevent hanging processes
  forceExit: true,
  
  // Detect handles preventing Jest from exiting
  detectOpenHandles: true,
  
  // Maximum number of concurrent test files
  maxConcurrency: 5,
  
  // Maximum number of workers
  maxWorkers: '50%',
  
  // Collect coverage from untested files
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/test-results/',
    '/__tests__/',
    '/__mocks__/',
    '/docs/'
  ],
  
  // Additional Jest configuration for EventEmitter memory leaks prevention
  testEnvironmentOptions: {
    // Set higher EventEmitter listener limit to prevent warnings
    eventEmitterLimit: 50
  },

  // Setup for proper cleanup and memory management
  maxConcurrency: 3, // Reduced from 5 to help with memory management
  maxWorkers: 1, // Use single worker to prevent EventEmitter issues
};