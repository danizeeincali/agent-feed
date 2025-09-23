/**
 * SPARC TDD Jest Configuration for Comprehensive Agent Path Validation
 * Optimized for London School TDD with mocking and parallel execution
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '<rootDir>/**/*.test.ts',
    '<rootDir>/**/*.test.js'
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.next/'
  ],

  // Transform TypeScript files
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/tests/coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json-summary'
  ],

  // Coverage thresholds (SPARC requirement: 100% coverage)
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },

  // Files to collect coverage from
  collectCoverageFrom: [
    'tests/**/*.{ts,tsx,js,jsx}',
    '!tests/**/*.d.ts',
    '!tests/coverage/**',
    '!tests/jest.*.js',
    '!tests/**/*.config.js'
  ],

  // Parallel execution for performance
  maxWorkers: '50%',

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests (London School TDD)
  clearMocks: true,
  restoreMocks: true,

  // Mock configuration
  resetMocks: true,
  resetModules: true,

  // Verbose output for detailed results
  verbose: true,

  // Error on deprecated warnings
  errorOnDeprecated: true,

  // Detect leaked handles
  detectLeaks: true,

  // Force exit after tests complete
  forceExit: true,

  // Module name mapping for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // Global variables
  globals: {
    'ts-jest': {
      useESM: true
    }
  },

  // Test result processor for detailed reporting
  // testResultsProcessor: '<rootDir>/tests/utils/test-results-processor.js',

  // Custom reporters
  reporters: [
    'default'
  ],

  // Project-specific configuration
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/tests/**/*.test.ts'],
      testPathIgnorePatterns: [
        '/integration-',
        '/performance-',
        '/e2e-'
      ]
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/tests/integration-*.test.ts'],
      testEnvironment: 'node'
    },
    {
      displayName: 'Performance Tests',
      testMatch: ['<rootDir>/tests/performance-*.test.ts'],
      testTimeout: 30000
    }
  ],

  // Watch mode configuration
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/.next/',
    '/dist/'
  ],

  // Snapshot configuration
  // snapshotSerializers: ['jest-serializer-path'],

  // Performance monitoring
  logHeapUsage: true,

  // Custom environment variables for tests
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
};