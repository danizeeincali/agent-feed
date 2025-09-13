/**
 * Jest Configuration for TDD London School Tests
 * 
 * Optimized for mock-driven testing with behavior verification
 * and interaction testing patterns.
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/**/*.test.js',
    '<rootDir>/**/*.spec.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/test-setup.js'
  ],
  
  // Mock configurations for London School testing
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/reports/coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  // Coverage thresholds for strict TDD compliance
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
    '<rootDir>/../../src/**/*.js',
    '!<rootDir>/../../src/**/*.test.js',
    '!<rootDir>/../../src/**/*.spec.js',
    '!<rootDir>/../../src/test-helpers/**',
    '!<rootDir>/../../node_modules/**'
  ],
  
  // Test results reporting
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/reports',
      outputName: 'tdd-london-school-results.xml',
      classNameTemplate: 'TDD London School - {classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }],
    ['jest-html-reporters', {
      publicPath: '<rootDir>/reports/html',
      filename: 'tdd-london-school-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'TDD London School Test Results'
    }]
  ],
  
  // Module resolution
  moduleFileExtensions: ['js', 'json', 'node'],
  
  // Transform configuration (if needed for ES modules)
  transform: {},
  
  // Test timeout for interaction testing
  testTimeout: 10000,
  
  // Verbose output for detailed mock interaction reporting
  verbose: true,
  
  // Custom test results processor for London School metrics
  testResultsProcessor: '<rootDir>/london-school-processor.js',
  
  // Global test variables
  globals: {
    'TDD_MODE': 'LONDON_SCHOOL',
    'MOCK_BEHAVIOR_VERIFICATION': true,
    'INTERACTION_TESTING': true
  },
  
  // Error handling
  errorOnDeprecated: true,
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/reports/',
    '<rootDir>/node_modules/'
  ],
  
  // Custom matchers and utilities
  moduleNameMapping: {
    '^@test-utils/(.*)$': '<rootDir>/test-helpers/$1',
    '^@mocks/(.*)$': '<rootDir>/mocks/$1'
  }
};