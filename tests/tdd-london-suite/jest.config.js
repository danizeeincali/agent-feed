/**
 * Jest Configuration for TDD London School Test Suite
 * 
 * Configured for behavior-driven testing with proper mocking boundaries.
 * Supports real process testing while mocking external dependencies.
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/tdd-london-suite/**/*.test.js'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'simple-backend.js',
    'frontend/src/**/*.{js,jsx,ts,tsx}',
    '!frontend/src/**/*.d.ts',
    '!frontend/src/**/*.stories.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**'
  ],
  coverageDirectory: 'coverage/tdd-london-suite',
  coverageReporters: [
    'text',
    'html',
    'lcov',
    'json-summary'
  ],
  
  // Coverage thresholds - London School focuses on behavior coverage
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './simple-backend.js': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/tdd-london-suite/setup/jest.setup.js'
  ],
  
  // Mock configurations
  clearMocks: true,
  resetMocks: false, // Keep manual mocks between tests
  restoreMocks: false, // Don't restore original implementations
  
  // Module path mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/tdd-london-suite/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  
  // Test timeout (longer for integration tests)
  testTimeout: 30000,
  
  // Verbose output for detailed test results
  verbose: true,
  
  // Bail on first failure (for quick feedback)
  bail: false,
  
  // Run tests in sequence for process testing
  maxWorkers: 1,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Mock configuration for external dependencies
  moduleNameMapping: {
    // Mock node-pty for unit tests (but allow real for integration)
    '^node-pty$': '<rootDir>/tests/tdd-london-suite/mocks/__mocks__/node-pty.js'
  },
  
  // Test suites organization
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: ['**/tests/tdd-london-suite/unit/**/*.test.js'],
      setupFilesAfterEnv: [
        '<rootDir>/tests/tdd-london-suite/setup/jest.setup.js',
        '<rootDir>/tests/tdd-london-suite/setup/unit.setup.js'
      ]
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['**/tests/tdd-london-suite/integration/**/*.test.js'],
      setupFilesAfterEnv: [
        '<rootDir>/tests/tdd-london-suite/setup/jest.setup.js',
        '<rootDir>/tests/tdd-london-suite/setup/integration.setup.js'
      ]
    },
    {
      displayName: 'Contract Tests',
      testMatch: ['**/tests/tdd-london-suite/contracts/**/*.test.js'],
      setupFilesAfterEnv: [
        '<rootDir>/tests/tdd-london-suite/setup/jest.setup.js',
        '<rootDir>/tests/tdd-london-suite/setup/contracts.setup.js'
      ]
    },
    {
      displayName: 'E2E Tests',
      testMatch: ['**/tests/tdd-london-suite/e2e/**/*.test.js'],
      setupFilesAfterEnv: [
        '<rootDir>/tests/tdd-london-suite/setup/jest.setup.js',
        '<rootDir>/tests/tdd-london-suite/setup/e2e.setup.js'
      ],
      testTimeout: 60000 // Longer timeout for E2E
    }
  ],
  
  // Global variables available in tests
  globals: {
    'process.env.NODE_ENV': 'test',
    'process.env.TEST_SUITE': 'tdd-london'
  },
  
  // Custom test results processor for London School reporting
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/tdd-london-suite/html-report',
        filename: 'london-school-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'TDD London School Test Results',
        logoImgPath: undefined,
        includeFailureMsg: true,
        includeSuiteFailure: true
      }
    ]
  ],
  
  // Watch configuration for development
  watchman: true,
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Performance optimizations
  cache: true,
  cacheDirectory: '<rootDir>/.cache/jest',
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  }
};