/**
 * Jest Configuration for TDD London School Input Buffering Tests
 * Optimized for mock-driven behavior verification testing
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/unit/**/*.test.js',
    '<rootDir>/integration/**/*.test.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/utils/test-setup.js'
  ],
  
  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Mock directories
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@mocks/(.*)$': '<rootDir>/mocks/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1'
  },
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'unit/**/*.js',
    'integration/**/*.js',
    'mocks/**/*.js',
    'utils/**/*.js',
    '!**/*.test.js',
    '!**/node_modules/**'
  ],
  
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  coverageDirectory: '<rootDir>/coverage',
  
  // Coverage thresholds for London School TDD
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90
    },
    './unit/': {
      branches: 95,
      functions: 98,
      lines: 95,
      statements: 95
    },
    './mocks/': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85
    }
  },
  
  // Test timeout for mock interactions
  testTimeout: 10000,
  
  // Clear mocks between tests (important for London School)
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Verbose output for interaction verification
  verbose: true,
  
  // Custom reporters for London School TDD insights
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './reports',
        filename: 'input-buffering-test-report.html',
        pageTitle: 'TDD London School: Input Buffering Tests',
        logoImgPath: undefined,
        hideIcon: false,
        expand: true,
        openReport: false,
        includeFailureMsg: true,
        includeSuiteFailure: true
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './reports',
        outputName: 'input-buffering-junit.xml',
        suiteName: 'Input Buffering TDD London School Tests'
      }
    ]
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Mock configuration for WebSocket and DOM APIs
  setupFiles: ['<rootDir>/utils/jest-setup.js'],
  
  // Test results processor for mock interaction analysis
  testResultsProcessor: '<rootDir>/utils/mock-interaction-processor.js',
  
  // Globals for test utilities
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'jsx', 'node'],
  
  // Test environment options for jsdom
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/'
  ],
  
  // Watch plugins for development
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Error on deprecated features
  errorOnDeprecated: true,
  
  // Fail fast on first test failure (useful for TDD)
  bail: false,
  
  // Max worker processes for parallel testing
  maxWorkers: '50%',
  
  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Collect coverage from source files
  forceCoverageMatch: ['**/mocks/**/*.js'],
  
  // Custom test sequencer for London School TDD
  testSequencer: '<rootDir>/utils/tdd-test-sequencer.js'
};