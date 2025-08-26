/**
 * Jest Configuration for TDD London School Test Suite
 * 
 * Configured for mock-driven testing with comprehensive behavior verification
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/*.test.js',
    '**/*.spec.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'html',
    'json',
    'lcov'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/scripts/'
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Mock configuration for London School TDD
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Test timing
  testTimeout: 30000, // 30 seconds for E2E tests
  
  // Reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage',
      outputName: 'junit.xml'
    }],
    ['jest-html-reporters', {
      publicPath: 'coverage/html-report',
      filename: 'test-report.html',
      expand: true,
      hideIcon: false
    }]
  ],
  
  // Module name mapping for absolute imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../src/$1'
  },
  
  // Test suites for organized execution
  projects: [
    {
      displayName: 'Unit Tests - Claude Instance Endpoints',
      testMatch: ['<rootDir>/claude-instance-endpoints.test.js'],
      collectCoverage: true,
      coverageReporters: ['text', 'json']
    },
    {
      displayName: 'Integration Tests - Frontend-Backend Contracts',
      testMatch: ['<rootDir>/frontend-backend-integration.test.js'],
      testTimeout: 20000
    },
    {
      displayName: 'E2E Tests - Instance Workflows',
      testMatch: ['<rootDir>/e2e-instance-workflows.test.js'],
      testTimeout: 60000,
      setupFilesAfterEnv: ['<rootDir>/jest.setup.e2e.js']
    },
    {
      displayName: 'Performance Benchmarks',
      testMatch: ['<rootDir>/performance-benchmarks.test.js'],
      testTimeout: 120000, // 2 minutes for performance tests
      collectCoverage: false // Performance tests don't need coverage
    },
    {
      displayName: 'Error Handling Scenarios',
      testMatch: ['<rootDir>/error-handling-scenarios.test.js'],
      collectCoverage: true
    }
  ],
  
  // Verbose output for detailed test results
  verbose: true,
  
  // Fail fast on first failing test suite
  bail: false,
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/.git/'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Global variables for test environment
  globals: {
    'TEST_ENVIRONMENT': 'london-school-tdd',
    'MOCK_BEHAVIOR_VERIFICATION': true,
    'INTERACTION_TESTING_MODE': true
  },
  
  // Test result processor for custom reporting
  testResultsProcessor: '<rootDir>/scripts/test-results-processor.js'
};