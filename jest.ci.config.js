/**
 * Jest Configuration for CI Environment
 * 
 * Optimized for GitHub Actions and automated testing with:
 * - Extended timeouts for CI environment
 * - Coverage reporting
 * - JUnit XML output
 * - Performance optimizations for CI
 */

const baseConfig = require('./jest.config.js');
const path = require('path');

module.exports = {
  ...baseConfig,
  
  // Test environment settings
  testEnvironment: 'node',
  testTimeout: 30000, // 30 seconds timeout for CI
  
  // Performance optimizations for CI
  maxWorkers: process.env.CI ? '50%' : '100%',
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.spec.js',
    '<rootDir>/tests/**/*.spec.ts',
    '<rootDir>/frontend/src/**/__tests__/**/*.{js,ts,tsx}',
    '<rootDir>/frontend/src/**/*.{test,spec}.{js,ts,tsx}'
  ],
  
  // Module paths
  modulePaths: ['<rootDir>', '<rootDir>/src', '<rootDir>/frontend/src'],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    'frontend/src/**/*.{js,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/coverage/**',
    '!**/*.config.js',
    '!**/*.config.ts'
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'clover'
  ],
  
  // Coverage thresholds - enforce minimum coverage
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Specific thresholds for critical files
    './src/claude-instance-manager.js': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/sse-handler.js': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Test result processing
  testResultsProcessor: 'jest-junit',
  
  // Reporters configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml',
      ancestorSeparator: ' › ',
      uniqueOutputName: false,
      suiteNameTemplate: '{filepath}',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}'
    }],
    ['jest-html-reporter', {
      pageTitle: 'Claude AI Response System Test Results',
      outputPath: 'test-results/test-report.html',
      includeFailureMsg: true,
      includeSuiteFailure: true
    }]
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/jest.setup.js'
  ],
  
  // Global test setup
  globalSetup: '<rootDir>/tests/jest.global-setup.js',
  globalTeardown: '<rootDir>/tests/jest.global-teardown.js',
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  
  // Module name mapping for aliases
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@frontend/(.*)$': '<rootDir>/frontend/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Test environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test',
    CI: 'true',
    MOCK_CLAUDE_CLI: 'true',
    TEST_TIMEOUT: '30000'
  },
  
  // Verbose output in CI for debugging
  verbose: process.env.CI === 'true',
  
  // Fail fast in CI
  bail: process.env.CI === 'true' ? 1 : 0,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Watch mode (disabled in CI)
  watchman: false,
  
  // Test patterns to ignore
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/frontend/dist/',
    '<rootDir>/frontend/build/',
    '<rootDir>/coverage/',
    '<rootDir>/.git/'
  ],
  
  // Coverage patterns to ignore
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/test-results/',
    '.d.ts$',
    '.config.js$',
    '.config.ts$'
  ],
  
  // Mock configurations
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx'],
  
  // Custom test sequences for CI
  testSequencer: '<rootDir>/tests/jest.test-sequencer.js',
  
  // Snapshot testing
  updateSnapshot: false, // Never update snapshots in CI
  
  // Performance monitoring
  detectOpenHandles: true,
  forceExit: true,
  
  // Custom matchers
  setupFilesAfterEnv: [
    '<rootDir>/tests/jest.setup.js',
    '<rootDir>/tests/custom-matchers.js'
  ]
};

// CI-specific overrides
if (process.env.CI) {
  module.exports.maxWorkers = 2; // Limit workers in CI for memory efficiency
  module.exports.workerIdleMemoryLimit = '512MB';
}

// GitHub Actions specific settings
if (process.env.GITHUB_ACTIONS) {
  module.exports.reporters.push([
    'github-actions',
    {
      silent: false
    }
  ]);
}